import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
const { ethGetBalance } = require('./helpers/web3');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Crowdsale = artifacts.require('VeraCrowdsale');
const Token = artifacts.require('VeraCoin');
const Oracle = artifacts.require('PriceOracle');

contract('PriceOracleIface', function () {
  const priceOracleIface = artifacts.require('PriceOracleIface');
  let result;
  beforeEach(async function () {
    this.priceOracleIface = await priceOracleIface.new();
  });
  describe('Check getUsdCentsFromWei method', async function () {
    it('getUsdCentsFromWei', async function () {
      result = await this.priceOracleIface.getUsdCentsFromWei(100).should.be.fulfilled;
      result.should.be.bignumber.equal(0);
    });
  });
});

contract('TransferableTokenIface', function (accounts) {
  const transferableTokenIface = artifacts.require('TransferableTokenIface');
  beforeEach(async function () {
    this.tkn = await transferableTokenIface.new().should.be.fulfilled;
  });
  describe('Check transfer method', async function () {
    it('transfer', async function () {
      await this.tkn.transfer(accounts[0], new BigNumber(100)).should.be.fulfilled;
    });
  });
});

contract('VeraCrowdsale', function (accounts) {

  let result;

  beforeEach(async function () {
    this.token = await Token.new();
    this.oracle = await Oracle.new(43212, 10);
    this.wallet = accounts[9];
    this.crowdsale = await Crowdsale.new(this.token.address, this.oracle.address, this.wallet);
    await this.token.transfer(this.crowdsale.address, 1000000 * 1e18);
  });

  describe('Check deployment requirements', async function () {
    it('unable to deploy with fewer args', async function () {
      await Crowdsale.new(this.token.address, this.oracle.address, 0).should.be.rejectedWith(EVMRevert);
      await Crowdsale.new(this.token.address, this.wallet, 0).should.be.rejectedWith(EVMRevert);
      await Crowdsale.new(this.oracle.address, this.wallet, 0).should.be.rejectedWith(EVMRevert);
      await Crowdsale.new(this.token.address, 0, 0).should.be.rejectedWith(EVMRevert);
      await Crowdsale.new(this.oracle.address, 0, 0).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('Check public variables', async function () {
    it('wallet', async function () {
      result = await this.crowdsale.wallet();
      result.should.be.equal(this.wallet);
    });
    it('token address', async function () {
      result = await this.crowdsale.token();
      result.should.be.equal(this.token.address);
    });
    it('tokenPriceInCents', async function () {
      result = await this.crowdsale.tokenPriceInCents();
      result.should.be.bignumber.equal(200);
    });
    it('centsRaised', async function () {
      result = await this.crowdsale.centsRaised();
      result.should.be.bignumber.equal(0);
    });
    it('tokensSold', async function () {
      result = await this.crowdsale.tokensSold();
      result.should.be.bignumber.equal(0);
    });
    it('amount bonus 0', async function () {
      result = await this.crowdsale.amountBonuses(0);
      result[0].should.be.bignumber.equal(0x1);
      result[1].should.be.bignumber.equal(800000);
      result[2].should.be.bignumber.equal(1999999);
      result[3].should.be.bignumber.equal(20);
    });
    it('amount bonus 1', async function () {
      result = await this.crowdsale.amountBonuses(1);
      result[0].should.be.bignumber.equal(0x2);
      result[1].should.be.bignumber.equal(2000000);
      result[2].should.be.bignumber.above(2 ** 255);
      result[3].should.be.bignumber.equal(30);
    });
  });

  describe('Check constant functions', async function () {
    it('computeBonus for 7999.99 USD', async function () {
      result = await this.crowdsale.computeBonuses(799999);
      result[0].should.be.bignumber.equal(0);
      result[1].should.be.bignumber.equal(0x0);
    });
    it('computeTokens for 7999.99 USD', async function () {
      result = await this.crowdsale.computeTokens(799999);
      result.should.be.bignumber.equal(0);
    });
    it('computeBonus for 8000 USD', async function () {
      result = await this.crowdsale.computeBonuses(800000);
      result[0].should.be.bignumber.equal(20);
      result[1].should.be.bignumber.equal(0x1);
    });
    it('computeTokens for 8000 USD', async function () {
      result = await this.crowdsale.computeTokens(800000);
      result.should.be.bignumber.equal(4.8e+21);
    });
    it('computeBonus for 19999.99 USD', async function () {
      result = await this.crowdsale.computeBonuses(1999999);
      result[0].should.be.bignumber.equal(20);
      result[1].should.be.bignumber.equal(0x1);
    });
    it('computeTokens for 19999.99 USD', async function () {
      result = await this.crowdsale.computeTokens(1999999);
      result.should.be.bignumber.equal(1.1999994e+22);
    });
    it('computeBonus for 20000 USD', async function () {
      result = await this.crowdsale.computeBonuses(2000000);
      result[0].should.be.bignumber.equal(30);
      result[1].should.be.bignumber.equal(0x2);
    });
    it('computeTokens for 20000 USD', async function () {
      result = await this.crowdsale.computeTokens(2000000);
      result.should.be.bignumber.equal(1.3e22);
    });
    it('computeBonus for 30000 USD', async function () {
      result = await this.crowdsale.computeBonuses(3000000);
      result[0].should.be.bignumber.equal(30);
      result[1].should.be.bignumber.equal(0x2);
    });
    it('computeTokens for 30000 USD', async function () {
      result = await this.crowdsale.computeTokens(3000000);
      result.should.be.bignumber.equal(1.95e+22);
    });
  });

  describe('RBAC', async function () {
    beforeEach(async function () {
      this.adminRoleName = await this.crowdsale.ROLE_ADMIN();
      this.backendRoleName = await this.crowdsale.ROLE_BACKEND();
      this.kycInvestor = await this.crowdsale.ROLE_KYC_VERIFIED_INVESTOR();
    });
    it('Initial role checks', async function () {
      result = await this.crowdsale.hasRole(accounts[0], this.adminRoleName);
      result.should.be.equal(true);
      result = await this.crowdsale.hasRole(accounts[1], this.adminRoleName);
      result.should.be.equal(false);
      result = await this.crowdsale.hasRole(accounts[0], this.backendRoleName);
      result.should.be.equal(false);
      result = await this.crowdsale.hasRole(accounts[1], this.backendRoleName);
      result.should.be.equal(false);
      result = await this.crowdsale.hasRole(accounts[0], this.kycInvestor);
      result.should.be.equal(false);
      result = await this.crowdsale.hasRole(accounts[1], this.kycInvestor);
      result.should.be.equal(false);
    });
    it('Non-admin unable to add admin', async function () {
      await this.crowdsale.addAdmin(accounts[1], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Non-admin unable to add backendRoleName', async function () {
      await this.crowdsale.addBackend(accounts[1], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Non-admin unable to del admin', async function () {
      await this.crowdsale.delAdmin(accounts[0], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });
    it('Admin is able to add admins', async function () {
      const { logs } = await this.crowdsale.addAdmin(accounts[2], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleAdded');
      event.args.addr.should.equal(accounts[2]);
      event.args.roleName.should.equal(this.adminRoleName);
    });
    it('Admin is able to add Backends', async function () {
      const { logs } = await this.crowdsale.addBackend(accounts[2], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleAdded');
      event.args.addr.should.equal(accounts[2]);
      event.args.roleName.should.equal(this.backendRoleName);
    });
    it('Admin is able to del admins (himself)', async function () {
      const { logs } = await this.crowdsale.delAdmin(accounts[0], { from: accounts[0] }).should.be.fulfilled;
      const event = logs.find(e => e.event === 'RoleRemoved');
      event.args.addr.should.equal(accounts[0]);
      event.args.roleName.should.equal(this.adminRoleName);
    });
    it('Non-backend unable to verify investors (admin privs don\'t make sense)', async function () {
      await this.crowdsale.addKycVerifiedInvestor(accounts[0], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.addKycVerifiedInvestor(accounts[0], { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
    });
    it('Non-admin is unable to withdraw tokens from crowdsale', async function () {
      await this.crowdsale.withdrawTokens(accounts[1], { from: accounts[1] }).should.be.rejectedWith(EVMRevert);
    });

    describe('after Acc1 added to admins', async function () {
      beforeEach(async function () {
        await this.crowdsale.addAdmin(accounts[1]).should.be.fulfilled;
      });

      it('Role checks - both are admins', async function () {
        result = await this.crowdsale.hasRole(accounts[0], this.adminRoleName);
        result.should.be.equal(true);
        result = await this.crowdsale.hasRole(accounts[1], this.adminRoleName);
        result.should.be.equal(true);
      });

      it('Both admins able to add admins', async function () {
        var tx = await this.crowdsale.addAdmin(accounts[2], { from: accounts[0] }).should.be.fulfilled;
        const logs1 = tx.logs;
        const event1 = logs1.find(e => e.event === 'RoleAdded');
        event1.args.addr.should.equal(accounts[2]);
        event1.args.roleName.should.equal(this.adminRoleName);
        tx = await this.crowdsale.addAdmin(accounts[3], { from: accounts[1] }).should.be.fulfilled;
        const logs2 = tx.logs;
        const event2 = logs2.find(e => e.event === 'RoleAdded');
        event2.args.addr.should.equal(accounts[3]);
        event2.args.roleName.should.equal(this.adminRoleName);
      });

      it('Non-admin unable to add admin', async function () {
        await this.crowdsale.addAdmin(accounts[2], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
      });

      it('Non-admin unable to del admin', async function () {
        await this.crowdsale.delAdmin(accounts[0], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
      });

      it('Admin is able to del admins', async function () {
        const { logs } = await this.crowdsale.delAdmin(accounts[0], { from: accounts[1] }).should.be.fulfilled;
        const event = logs.find(e => e.event === 'RoleRemoved');
        event.args.addr.should.equal(accounts[0]);
        event.args.roleName.should.equal(this.adminRoleName);
      });

      it('Admin is able fo withdraw tokens to himself', async function () {
        const contractTokenBalanceBefore = await this.token.balanceOf(this.crowdsale.address);
        const adminTokenBalanceBefore = await this.token.balanceOf(accounts[0]);
        await this.crowdsale.withdrawTokens(accounts[0], { from: accounts[0] }).should.be.fulfilled;
        const contractTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
        const adminTokenBalanceAfter = await this.token.balanceOf(accounts[0]);
        contractTokenBalanceAfter.should.be.bignumber.equal(0);
        adminTokenBalanceAfter.minus(adminTokenBalanceBefore).should.be.bignumber.equal(contractTokenBalanceBefore);
      });

      it('Admin is able fo withdraw tokens to other addresses', async function () {
        const contractTokenBalanceBefore = await this.token.balanceOf(this.crowdsale.address);
        const rcvrTokenBalanceBefore = await this.token.balanceOf(accounts[9]);
        await this.crowdsale.withdrawTokens(accounts[9], { from: accounts[0] }).should.be.fulfilled;
        const contractTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
        const rcvrTokenBalanceAfter = await this.token.balanceOf(accounts[9]);
        contractTokenBalanceAfter.should.be.bignumber.equal(0);
        rcvrTokenBalanceAfter.minus(rcvrTokenBalanceBefore).should.be.bignumber.equal(contractTokenBalanceBefore);
      });

      describe('Acc3 added to backends', async function () {
        beforeEach(async function () {
          await this.crowdsale.addBackend(accounts[3]).should.be.fulfilled;
        });

        it('Backend manager is able to verify and un-verify investors', async function () {
          result = await this.crowdsale.hasRole(accounts[2], this.kycInvestor);
          result.should.be.equal(false);
          var tx = await this.crowdsale.addKycVerifiedInvestor(accounts[2], { from: accounts[3] }).should.be.fulfilled;
          const logs1 = tx.logs;
          const event1 = logs1.find(e => e.event === 'RoleAdded');
          event1.args.addr.should.equal(accounts[2]);
          event1.args.roleName.should.equal(this.kycInvestor);
          result = await this.crowdsale.hasRole(accounts[2], this.kycInvestor);
          result.should.be.equal(true);
          tx = await this.crowdsale.delKycVerifiedInvestor(accounts[2], { from: accounts[3] }).should.be.fulfilled;
          const logs2 = tx.logs;
          const event2 = logs2.find(e => e.event === 'RoleRemoved');
          event2.args.addr.should.equal(accounts[2]);
          event2.args.roleName.should.equal(this.kycInvestor);
          result = await this.crowdsale.hasRole(accounts[2], this.kycInvestor);
          result.should.be.equal(false);
        });

        it('admin is able to del Backends', async function () {
          const { logs } = await this.crowdsale.delBackend(accounts[3], { from: accounts[1] }).should.be.fulfilled;
          const event = logs.find(e => e.event === 'RoleRemoved');
          event.args.addr.should.equal(accounts[3]);
          event.args.roleName.should.equal(this.backendRoleName);
        });

        it('another admin is able to del Backends', async function () {
          const { logs } = await this.crowdsale.delBackend(accounts[3], { from: accounts[0] }).should.be.fulfilled;
          const event = logs.find(e => e.event === 'RoleRemoved');
          event.args.addr.should.equal(accounts[3]);
          event.args.roleName.should.equal(this.backendRoleName);
        });

        it('Non-admin unable to del Backends', async function () {
          await this.crowdsale.delBackend(accounts[3], { from: accounts[2] }).should.be.rejectedWith(EVMRevert);
        });

        it('kycManager unable to del Backend (if not admin)', async function () {
          await this.crowdsale.delBackend(accounts[3], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('Backend unable to add admins', async function () {
          await this.crowdsale.addAdmin(accounts[4], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('Backend unable to del admins', async function () {
          await this.crowdsale.delAdmin(accounts[1], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        it('Backend is unable to withdraw tokens from crowdsale', async function () {
          await this.crowdsale.withdrawTokens(accounts[0], { from: accounts[3] }).should.be.rejectedWith(EVMRevert);
        });

        describe('Acc3 removed from Backend', async function () {
          beforeEach(async function () {
            await this.crowdsale.delBackend(accounts[3]).should.be.fulfilled;
          });
          it('* ToDo check Backend privileges revoked', async function () {
            assert(true);
          });
        });
      });

      describe('then Acc0 removed from admins', async function () {
        beforeEach(async function () {
          await this.crowdsale.delAdmin(accounts[0], { from: accounts[1] }).should.be.fulfilled;
        });

        it('Role checks - admin is Acc1 only', async function () {
          result = await this.crowdsale.hasRole(accounts[0], this.adminRoleName);
          result.should.be.equal(false);
          result = await this.crowdsale.hasRole(accounts[1], this.adminRoleName);
          result.should.be.equal(true);
        });

        it('Non-admin unable to add admin', async function () {
          await this.crowdsale.addAdmin(accounts[2], { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });

        it('Non-admin is unable to withdraw tokens from crowdsale', async function () {
          await this.crowdsale.withdrawTokens(accounts[0], { from: accounts[0] }).should.be.rejectedWith(EVMRevert);
        });

        it('Admin is able to add admins', async function () {
          await this.crowdsale.addAdmin(accounts[3], { from: accounts[1] }).should.be.fulfilled;
        });
      });
    });
  });

  describe('accepting payments to fallback', function () {
    function assertPaymentOk (etherDeposited, bonusPercent, bonusId) {
      return async function () {
        const precision = 5;
        const valueInCents = Math.floor(etherDeposited * this.ethPriceInCents);
        const investorTokenBalanceBefore = await this.token.balanceOf(accounts[0]);
        const contractTokenBalanceBefore = await this.token.balanceOf(this.crowdsale.address);
        const centsRaisedBefore = await this.crowdsale.centsRaised();
        const tokensSoldBefore = await this.crowdsale.tokensSold();
        const walletBalanceBefore = await ethGetBalance(this.wallet);
        const receipt = await this.crowdsale.send(ether(etherDeposited)).should.be.fulfilled;
        const investorTokenBalanceAfter = await this.token.balanceOf(accounts[0]);
        const contractTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
        const centsRaisedAfter = await this.crowdsale.centsRaised();
        const tokensSoldAfter = await this.crowdsale.tokensSold();
        const walletBalanceAfter = await ethGetBalance(this.wallet);
        BigNumber.config({ ERRORS: false });
        const tokensCalculatedAmount = new BigNumber(etherDeposited * 1e18 * this.ethPriceInCents /
          this.tokenPriceInCents / 100 * (100 + bonusPercent)).toPrecision(precision);
        BigNumber.config({ ERRORS: true });
        investorTokenBalanceAfter.minus(investorTokenBalanceBefore).toPrecision(precision).should.be
          .bignumber.equal(tokensCalculatedAmount);
        contractTokenBalanceBefore.minus(contractTokenBalanceAfter).toPrecision(precision).should.be
          .bignumber.equal(tokensCalculatedAmount);
        tokensSoldAfter.minus(tokensSoldBefore).toPrecision(precision).should.be.bignumber
          .equal(tokensCalculatedAmount);
        centsRaisedAfter.minus(centsRaisedBefore).should.be.bignumber.equal(valueInCents);
        walletBalanceAfter.minus(walletBalanceBefore).should.be.bignumber.equal(ether(etherDeposited));
        const logs = receipt.logs;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'TokenPurchase');
        assert.equal(logs[0].args.investor, accounts[0]);
        logs[0].args.ethPriceInCents.should.be.bignumber.equal(this.ethPriceInCents);
        logs[0].args.valueInCents.should.be.bignumber.equal(new BigNumber(valueInCents));
        logs[0].args.bonusPercent.should.be.bignumber.equal(new BigNumber(bonusPercent));
        logs[0].args.bonusIds.should.be.bignumber.equal(new BigNumber(bonusId));
      };
    }
    beforeEach(async function () {
      this.tokenPriceInCents = 200;
    });
    describe('if sender is not in KYC approved investors', function () {
      it('should reject payments less than minDeposit', async function () {
        await this.crowdsale.send(ether(18.5)).should.be.rejectedWith(EVMRevert);
      });
      it('should reject payments more than minDeposit', async function () {
        await this.crowdsale.send(ether(18.6)).should.be.rejectedWith(EVMRevert);
      });
    });
    describe('if sender is KYC approved', function () {
      beforeEach(async function () {
        await this.crowdsale.addBackend(accounts[1]).should.be.fulfilled;
        await this.crowdsale.addKycVerifiedInvestor(accounts[0], { from: accounts[1] }).should.be.fulfilled;
      });
      it('should reject payments less than minDeposit', async function () {
        await this.crowdsale.send(ether(18.5)).should.be.rejectedWith(EVMRevert);
      });
      describe('check actual deposit effects', function () {
        describe('by 432.12 USD/ETH', function () {
          beforeEach(async function () {
            this.ethPriceInCents = 43212;
          });
          it('check ethPrice', async function () {
            result = await this.oracle.ethPriceInCents();
            result.should.be.bignumber.equal(this.ethPriceInCents);
          });
          it('18.5 ETH should be rejected  - less than minDeposit', async function () {
            await this.crowdsale.send(ether(18.5)).should.be.rejectedWith(EVMRevert);
          });
          it('18.6 ETH', assertPaymentOk(18.6, 20, 1));
        });
        describe('by 5832.12 USD/ETH', function () {
          beforeEach(async function () {
            this.ethPriceInCents = 583212;
            this.tokenPriceInCents = 200;
            await this.oracle.addOracle(accounts[0]).should.be.fulfilled;
            var price = await this.oracle.ethPriceInCents();
            while (price < this.ethPriceInCents) {
              await this.oracle.setEthPrice(price).should.be.fulfilled;
              price = Math.floor(price * 1.08);
            }
            await this.oracle.setEthPrice(this.ethPriceInCents).should.be.fulfilled;
          });
          it('check ethPrice', async function () {
            result = await this.oracle.ethPriceInCents();
            result.should.be.bignumber.equal(this.ethPriceInCents);
          });
          it('1.37 ETH should be rejected  - less than minDeposit', async function () {
            await this.crowdsale.send(ether(1.37)).should.be.rejectedWith(EVMRevert);
          });
          it('1.4 ETH', assertPaymentOk(1.4, 20, 1));
          it('3.4 ETH', assertPaymentOk(3.4, 20, 1));
          it('3.5 ETH', assertPaymentOk(3.5, 30, 2));
          it('37 ETH', assertPaymentOk(37, 30, 2));
        });
      });
    });
  });

  describe('accepting backend-originated buy requests', function () {
    beforeEach(async function () {
      await this.crowdsale.addBackend(accounts[1]).should.be.fulfilled;
      await this.crowdsale.addKycVerifiedInvestor(accounts[0], { from: accounts[1] }).should.be.fulfilled;
    });

    describe('by 534.96 USD/ETH', function () {
      beforeEach(async function () {
        this.ethPriceInCents = 53496;
        this.tokenPriceInCents = 200;
        await this.oracle.addOracle(accounts[0]).should.be.fulfilled;
        var price = await this.oracle.ethPriceInCents();
        while (price < this.ethPriceInCents) {
          await this.oracle.setEthPrice(price).should.be.fulfilled;
          price = Math.floor(price * 1.08);
        }
        await this.oracle.setEthPrice(this.ethPriceInCents).should.be.fulfilled;
      });
      it('8543.45 USD', async function () {
        const bonusPercent = 20;
        const precision = 5;
        const valueInCents = 854345;
        const bonusId = 1;
        const investorTokenBalanceBefore = await this.token.balanceOf(accounts[0]);
        const contractTokenBalanceBefore = await this.token.balanceOf(this.crowdsale.address);
        const centsRaisedBefore = await this.crowdsale.centsRaised();
        const tokensSoldBefore = await this.crowdsale.tokensSold();
        const receipt = await this.crowdsale.buyTokensViaBackend(accounts[0], valueInCents, { from: accounts[1] })
          .should.be.fulfilled;
        const investorTokenBalanceAfter = await this.token.balanceOf(accounts[0]);
        const contractTokenBalanceAfter = await this.token.balanceOf(this.crowdsale.address);
        const centsRaisedAfter = await this.crowdsale.centsRaised();
        const tokensSoldAfter = await this.crowdsale.tokensSold();
        BigNumber.config({ ERRORS: true });
        const tokensCalculatedAmount = new BigNumber(1e18 * valueInCents / this.tokenPriceInCents / 100 * (100 + bonusPercent))
          .toPrecision(precision);
        BigNumber.config({ ERRORS: true });
        investorTokenBalanceAfter.minus(investorTokenBalanceBefore).toPrecision(precision).should.be
          .bignumber.equal(tokensCalculatedAmount);
        contractTokenBalanceBefore.minus(contractTokenBalanceAfter).toPrecision(precision).should.be
          .bignumber.equal(tokensCalculatedAmount);
        tokensSoldAfter.minus(tokensSoldBefore).toPrecision(precision).should.be
          .bignumber.equal(tokensCalculatedAmount);
        centsRaisedAfter.minus(centsRaisedBefore).should.be
          .bignumber.equal(valueInCents);
        const logs = receipt.logs;
        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'TokenPurchase');
        assert.equal(logs[0].args.investor, accounts[0]);
        logs[0].args.ethPriceInCents.should.be.bignumber.equal(this.ethPriceInCents);
        logs[0].args.valueInCents.should.be.bignumber.equal(new BigNumber(valueInCents));
        logs[0].args.bonusPercent.should.be.bignumber.equal(new BigNumber(bonusPercent));
        logs[0].args.bonusIds.should.be.bignumber.equal(new BigNumber(bonusId));
      });
    });
  });
});

