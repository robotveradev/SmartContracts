import {EVMRevert} from './helpers/EVMRevert';
import {ether} from './helpers/ether';

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Withdrawable = artifacts.require('../token/Withdrawable.sol');
const VeraCoin = artifacts.require('../token/VeraCoin.sol');

contract('Withdrawable', function (accounts) {

    const other = accounts[9];


    beforeEach(async function () {
        this.withdrawable = await Withdrawable.new();
        this.token = await VeraCoin.new();
    });

    describe('after transfer money to withdrawable contract', function () {
        beforeEach(async function () {
            await this.token.transfer(this.withdrawable.address, 1000);
        });

        it('balance of withdrawable is 1000', async function () {
            let balance = await this.token.balanceOf(this.withdrawable.address);
            balance.should.be.bignumber.equal(1000);
        });

        it('withdraw tokens to another', async function () {
            await this.withdrawable.withdraw(this.token.address, other, 400);
            let balance = await this.token.balanceOf(this.withdrawable.address);
            balance.should.be.bignumber.equal(600);
            let other_balance = await this.token.balanceOf(other);
            other_balance.should.be.bignumber.equal(400);
        });
    });
});
