import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Oracle = artifacts.require('PriceOracle');

contract('PriceOracle', function (accounts) {
  const priceInCents = new BigNumber(1234556);
  const allowedOracleChangePercent = new BigNumber(10);
  let result;

  beforeEach(async function () {
    this.oracle = await Oracle.new(priceInCents, allowedOracleChangePercent);
  });

  describe('Check public variables', async function () {
    it('ethPriceInCents', async function () {
      result = await this.oracle.ethPriceInCents();
      result.should.be.bignumber.equal(priceInCents);
    });
    it('allowedOracleChangePercent', async function () {
      result = await this.oracle.allowedOracleChangePercent();
      result.should.be.bignumber.equal(allowedOracleChangePercent);
    });
  });

  describe('Check rate conversion functions with 12345.56 USD/ETH', async function () {
    it('getUsdCentsFromWei 1e14 wei', async function () {
      result = await this.oracle.getUsdCentsFromWei(new BigNumber(1e14));
      result.should.be.bignumber.equal(123);
    });
    it('getUsdCentsFromWei 1e15 wei', async function () {
      result = await this.oracle.getUsdCentsFromWei(new BigNumber(1e15));
      result.should.be.bignumber.equal(1234);
    });
    it('getUsdCentsFromWei 1e16 wei', async function () {
      result = await this.oracle.getUsdCentsFromWei(new BigNumber(1e16));
      result.should.be.bignumber.equal(12345);
    });
    it('getUsdCentsFromWei 1.22 ETH', async function () {
      result = await this.oracle.getUsdCentsFromWei(new BigNumber(122e16));
      result.should.be.bignumber.equal(1506158);
    });
    it('getUsdCentsFromWei 123.32 ETH', async function () {
      result = await this.oracle.getUsdCentsFromWei(new BigNumber(12332e16));
      result.should.be.bignumber.equal(152245445);
    });
    it('getWeiFromUsdCents 12345.56 USD', async function () {
      result = await this.oracle.getWeiFromUsdCents(new BigNumber(1234556));
      result.should.be.bignumber.equal(1e18);
    });
    describe('Check rate conversion functions for 123.12 USD per ETH', async function () {
      beforeEach(async function () {
        this.oracle = await Oracle.new(new BigNumber(12312), allowedOracleChangePercent);
      });
      it('getUsdCentsFromWei 1e15 wei', async function () {
        result = await this.oracle.getUsdCentsFromWei(new BigNumber(1e15));
        result.should.be.bignumber.equal(12);
      });
      it('getUsdCentsFromWei 1e16 wei', async function () {
        result = await this.oracle.getUsdCentsFromWei(new BigNumber(1e16));
        result.should.be.bignumber.equal(123);
      });
      it('getUsdCentsFromWei 1.22 ETH', async function () {
        result = await this.oracle.getUsdCentsFromWei(new BigNumber(122e16));
        result.should.be.bignumber.equal(15020);
      });
      it('getUsdCentsFromWei 123.32 ETH', async function () {
        result = await this.oracle.getUsdCentsFromWei(new BigNumber(12332e16));
        result.should.be.bignumber.equal(1518315);
      });
      it('getWeiFromUsdCents 123.12 USD', async function () {
        result = await this.oracle.getWeiFromUsdCents(new BigNumber(12312));
        result.should.be.bignumber.equal(1e18);
      });
      it('getWeiFromUsdCents 12.31 USD', async function () {
        result = await this.oracle.getWeiFromUsdCents(new BigNumber(24624));
        result.should.be.bignumber.equal(2e18);
      });
    });
  });

  describe('RBAC', async function () {
    beforeEach(async function () {
      this.roleAdmin = await this.oracle.ROLE_ADMIN();
      this.roleOracle = await this.oracle.ROLE_ORACLE();
    });
    it('initial roles', async function () {
      result = await this.oracle.hasRole(accounts[0], this.roleAdmin);
      result.should.be.equal(true);
      result = await this.oracle.hasRole(accounts[1], this.roleAdmin);
      result.should.be.equal(false);
      result = await this.oracle.hasRole(accounts[0], this.roleOracle);
      result.should.be.equal(false);
      result = await this.oracle.hasRole(accounts[1], this.roleOracle);
      result.should.be.equal(false);
    });
    it('Non-admin unable to add admin', async function () {
      await this.oracle.addAdmin(accounts[1], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Non-admin unable to add Oracle', async function () {
      await this.oracle.addOracle(accounts[1], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Non-admin unable to del admin', async function () {
      await this.oracle.delAdmin(accounts[0], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Admin is able to add admins', async function () {
      const { logs } = await this.oracle.addAdmin(accounts[2], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleAdded');
      event.args.addr.should.equal(accounts[2]);
      event.args.roleName.should.equal(this.roleAdmin);
    });
    it('Admin is able to add Oracles', async function () {
      const { logs } = await this.oracle.addOracle(accounts[2], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleAdded');
      event.args.addr.should.equal(accounts[2]);
      event.args.roleName.should.equal(this.roleOracle);
    });
    it('Admin is able to del admins (himself)', async function () {
      const { logs } = await this.oracle.delAdmin(accounts[0], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleRemoved');
      event.args.addr.should.equal(accounts[0]);
      event.args.roleName.should.equal(this.roleAdmin);
    });
    it('Non-oracle unable to update rate (admin privs don\'t make sense)', async function () {
      await this.oracle.setEthPrice(1234555, { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
      await this.oracle.setEthPrice(1234555, { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
    });

    describe('after Acc1 added to admins', async function () {

      beforeEach(async function () {
        await this.oracle.addAdmin(accounts[1]).should.be.fulfilled;
      });

      it('Role checks - both are admins', async function () {
        result = await this.oracle.hasRole(accounts[0], this.roleAdmin);
        result.should.be.equal(true);
        result = await this.oracle.hasRole(accounts[1], this.roleAdmin);
        result.should.be.equal(true);
      });

      it('Both admins able to add admins', async function () {
        var tx = await this.oracle.addAdmin(accounts[2], { from: accounts[0] }).should.be.fulfilled;
        const logs1 = tx.logs;
        const event1 = logs1.find(e => e.event === 'RoleAdded');
        event1.args.addr.should.equal(accounts[2]);
        event1.args.roleName.should.equal(this.roleAdmin);
        tx = await this.oracle.addAdmin(accounts[3], { from: accounts[1] }).should.be.fulfilled;
        const logs2 = tx.logs;
        const event2 = logs2.find(e => e.event === 'RoleAdded');
        event2.args.addr.should.equal(accounts[3]);
        event2.args.roleName.should.equal(this.roleAdmin);
      });

      it('Non-admin unable to add admin', async function () {
        await this.oracle.addAdmin(accounts[2], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
      });

      it('Non-admin unable to del admin', async function () {
        await this.oracle.delAdmin(accounts[0], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
      });

      it('Admin is able to del admins', async function () {
        const { logs } = await this.oracle.delAdmin(accounts[0], { from: accounts[1] }).should.be.fulfilled;
        const event = logs.find(e => e.event === 'RoleRemoved');
        event.args.addr.should.equal(accounts[0]);
        event.args.roleName.should.equal(this.roleAdmin);
      });

      describe('Acc3 added to oracles', async function () {
        beforeEach(async function () {
          await this.oracle.addOracle(accounts[3]).should.be.fulfilled;
        });

        it('check Acc3 in oracles', async function () {
          result = await this.oracle.hasRole(accounts[3], this.roleOracle);
          result.should.be.equal(true);
        });

        it('Oracle is able to set ETH price', async function () {
          await this.oracle.setEthPrice(new BigNumber(1234666), { from: accounts[3] }).should.be.fulfilled;
          result = await this.oracle.ethPriceInCents();
          result.should.be.bignumber.equal(1234666);
        });

        it('admin is able to del oracles', async function () {
          const { logs } = await this.oracle.delOracle(accounts[3], { from: accounts[1] }).should.be.fulfilled;
          const event = logs.find(e => e.event === 'RoleRemoved');
          event.args.addr.should.equal(accounts[3]);
          event.args.roleName.should.equal(this.roleOracle);
        });

        it('another admin is able to del oracles', async function () {
          const { logs } = await this.oracle.delOracle(accounts[3], { from: accounts[0] }).should.be.fulfilled;
          const event = logs.find(e => e.event === 'RoleRemoved');
          event.args.addr.should.equal(accounts[3]);
          event.args.roleName.should.equal(this.roleOracle);
        });

        it('Non-admin unable to del oracle', async function () {
          await this.oracle.delOracle(accounts[3], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
        });

        it('oracle unable to del oracle (if not admin)', async function () {
          await this.oracle.delOracle(accounts[3], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('oracle unable to add admins', async function () {
          await this.oracle.addAdmin(accounts[4], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('oracle unable to del admins', async function () {
          await this.oracle.delAdmin(accounts[1], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        describe('Acc3 removed from Oracles', async function () {
          beforeEach(async function () {
            await this.oracle.delOracle(accounts[3]).should.be.fulfilled;
          });
          it('check Acc3 not in oracles', async function () {
            result = await this.oracle.hasRole(accounts[3], this.roleOracle);
            result.should.be.equal(false);
          });
          it('Oracle is able to set ETH price', async function () {
            await this.oracle.setEthPrice(new BigNumber(1234666), { from: accounts[3] })
              .should.be.rejectedWith(EVMRevert);
          });
        });
      });
    });
  });

  describe('Check ability to set price with allowedOracleChangePercent=9%', async function () {
    beforeEach(async function () {
      this.oracle = await Oracle.new(new BigNumber(22496), new BigNumber(9));
      this.roleOracle = await this.oracle.ROLE_ORACLE();
      await this.oracle.addOracle(accounts[3]).should.be.fulfilled;
    });
    it('Oracle is able to set ETH price up if delta is less than 9%', async function () {
      await this.oracle.setEthPrice(new BigNumber(24520), { from: accounts[3] }).should.be.fulfilled;
      result = await this.oracle.ethPriceInCents();
      result.should.be.bignumber.equal(24520);
    });
    it('Oracle is able to set ETH price down if delta is less than 9%', async function () {
      await this.oracle.setEthPrice(new BigNumber(20471), { from: accounts[3] }).should.be.fulfilled;
      result = await this.oracle.ethPriceInCents();
      result.should.be.bignumber.equal(20471);
    });
    it('Reverts if oracle sets price up more than 9%', async function () {
      await this.oracle.setEthPrice(new BigNumber(24521), { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
    });
    it('Reverts if oracle sets price down more than 9%', async function () {
      await this.oracle.setEthPrice(new BigNumber(20470), { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
    });
    describe('with allowedOracleChangePercent=10%', async function () {
      beforeEach(async function () {
        this.oracle = await Oracle.new(new BigNumber(22496), new BigNumber(10));
        this.roleOracle = await this.oracle.ROLE_ORACLE();
        await this.oracle.addOracle(accounts[3]).should.be.fulfilled;
      });
      it('Oracle is able to set ETH price up to 9%+ but less than 10%', async function () {
        await this.oracle.setEthPrice(new BigNumber(24521), { from: accounts[3] }).should.be.fulfilled;
        result = await this.oracle.ethPriceInCents();
        result.should.be.bignumber.equal(24521);
      });
      it('Oracle is able to set ETH price down to 9%+ but less than 10%', async function () {
        await this.oracle.setEthPrice(new BigNumber(20470), { from: accounts[3] }).should.be.fulfilled;
        result = await this.oracle.ethPriceInCents();
        result.should.be.bignumber.equal(20470);
      });
    });
  });
});
