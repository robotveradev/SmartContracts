import {EVMRevert} from './helpers/EVMRevert';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

require('chai')
    .use(require('chai-as-promised'))
    .should();

const Ownable = artifacts.require('../Ownable.sol');

contract('Ownable', function (accounts) {

    describe('as an ownable', function () {

        beforeEach(async function () {
            this.ownable = await Ownable.new();
        });

        it('should have an owner', async function () {
            let coinbase_owner = await this.ownable.owners(accounts[0]);
            assert.isTrue(coinbase_owner);
        });

        it('new owner', async function () {
            let other = accounts[1];
            await this.ownable.newOwner(other);
            let owner = await this.ownable.owners(other);
            assert.isTrue(owner);
        });

        it('zero address as owner rejected', async function () {
            await this.ownable.newOwner(ZERO_ADDRESS).should.be.rejectedWith(EVMRevert);
        });
    });
});
