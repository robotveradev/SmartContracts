import {EVMRevert} from './helpers/EVMRevert';
import {ether} from './helpers/ether';

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Candidate = artifacts.require('../Candidate.sol');
const Oracle = artifacts.require('../Oracle.sol');
const VeraCoin = artifacts.require('../token/VeraCoin.sol');

contract('Candidate', function (accounts) {

    const _name = 'Oracle';
    const _service_fee = 5;
    const _beneficiary = accounts[1];
    const _candidate_id = '0xe03044261755f8860a9294552706b3e03044261755f8860a9294552706b3b3e0';
    const _vacancy_id = '0xe03044261755f8860a9294552706b3e03044261755f8860a9294552706b3eed3';
    const employer = accounts[5];


    beforeEach(async function () {
        this.token = await VeraCoin.new();
        this.oracle = await Oracle.new(_name, _service_fee, _beneficiary, this.token.address);
        this.candidate = await Candidate.new(_candidate_id, this.oracle.address);
    });

    describe('initial state', async function () {

        it('check initial data', async function () {
            let candidate_id = await this.candidate.id();
            candidate_id.should.be.equal(_candidate_id);
        });

        describe('after subscribe to vacancy', async function () {

            beforeEach(async function () {
                await this.oracle.new_employer(employer);
                await this.oracle.new_vacancy(employer, _vacancy_id, 5000 * 10 ** 18);
                await this.oracle.enable_vac(_vacancy_id, {from: employer});
                await this.candidate.subscribe(_vacancy_id);
            });

            it('candidate subscribed', async function () {
                let starts = await this.oracle.vacancy_candidate_starts(_vacancy_id, this.candidate.address);
                assert.isTrue(starts);
            });
        });
    });
});
