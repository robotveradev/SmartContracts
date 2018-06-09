import {EVMRevert} from './helpers/EVMRevert';
import {ether} from './helpers/ether';
import rep_u0 from "./helpers/replace";

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Employer = artifacts.require('../Employer.sol');
const Oracle = artifacts.require('../Oracle.sol');
const VeraCoin = artifacts.require('../token/VeraCoin.sol');

contract('Employer', function (accounts) {

    const _name = 'Oracle';
    const _service_fee = 5;
    const _beneficiary = accounts[1];
    const _employer_id = '0xe03044261755f8860a9294552706b3e03044261755f8860a9294552706b3b3e0';
    const candidate = accounts[9];


    beforeEach(async function () {
        this.token = await VeraCoin.new();
        this.oracle = await Oracle.new(_name, _service_fee, _beneficiary, this.token.address);
        this.employer = await Employer.new(_employer_id, this.token.address, this.oracle.address);
    });

    describe('initial state', async function () {

        it('check initial data', async function () {
            let employer_id = await this.employer.id();
            employer_id.should.be.equal(_employer_id);
        });

        it('pause', async function () {
            await this.employer.pause();
        });

        it('unpause when unpaused rejected', async function () {
            await this.employer.unpause().should.be.rejectedWith(EVMRevert);
        });

        describe('after pause', async function () {
            beforeEach(async function () {
                await this.employer.pause();
            });

            it('unpause', async function () {
                await this.employer.unpause();
            });

            it('pause when paused rejected', async function () {
                await this.employer.pause().should.be.rejectedWith(EVMRevert);
            });
        });

        describe('functionality', async function () {

            it('approve tokens for oracle', async function () {
                await this.employer.approve_money(1000);
            });

            describe('after create vacancy', async function () {

                beforeEach(async function () {
                    await this.oracle.new_employer(this.employer.address);
                    await this.oracle.new_vacancy(this.employer.address, "0xabcd", 5000 * 10 ** 18);
                    let vacancies_uuid = await this.oracle.employer_vacancies(this.employer.address);
                    this.vacancy_uuid = vacancies_uuid[0];
                });

                it('change vacancy allowance amount', async function () {
                    await this.employer.change_vacancy_allowance_amount(this.vacancy_uuid, 1000);
                    let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                    vacancy[2].should.be.bignumber.equal(1000);
                });

                it('add vacancy pipeline action', async function () {
                    await this.employer.new_vacancy_pipeline_action(this.vacancy_uuid, "one", 200, true);
                    let pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                    pipeline_length.should.be.bignumber.equal(1);
                });

                describe('add multiple vacancy pipeline actions', async function () {

                    beforeEach(async function () {
                        for (let i = 0; i < 3; i++) {
                            await this.employer.new_vacancy_pipeline_action(this.vacancy_uuid, `test${i}`, 0, true);
                        }
                    });

                    it('deleting vacancy pipeline action', async function () {
                        await this.employer.delete_vacancy_pipeline_action(this.vacancy_uuid, 2);
                        let pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                        pipeline_length.should.be.bignumber.equal(2);
                    });

                    it('moving up vacancy pipeline action', async function () {
                        await this.employer.move_vacancy_pipeline_action(this.vacancy_uuid, 0, 2);
                    });

                    it('moving down vacancy pipeline action', async function () {
                        await this.employer.move_vacancy_pipeline_action(this.vacancy_uuid, 2, 0);
                    });

                    it('change vacancy pipeline action', async function () {
                        await this.employer.change_vacancy_pipeline_action(this.vacancy_uuid, 1, "test", 0, false);
                        let action = await this.oracle.vacancy_pipeline(this.vacancy_uuid, 1);
                        action[0].should.be.bignumber.equal(1);
                        rep_u0(web3.toAscii(action[1])).should.be.equal("test");
                        action[2].should.be.bignumber.equal(0);
                        assert.isFalse(action[3]);
                    });

                    describe('after candidate subscribe', async function () {

                        beforeEach(async function () {
                            await this.employer.enable_vac(this.vacancy_uuid);
                            await this.oracle.subscribe(this.vacancy_uuid, {from: candidate});
                        });

                        it('employer can level up candidate', async function () {
                            await this.employer.approve_level_up(this.vacancy_uuid, candidate);
                        });

                        it('employer can reset candidate status', async function () {
                            await this.employer.reset_candidate_action(this.vacancy_uuid, candidate);
                        });
                    });
                });

                describe('vacancy disableable', async function () {

                    it('enable vacancy', async function () {
                        await this.employer.enable_vac(this.vacancy_uuid);
                        let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                        assert.isTrue(vacancy[1]);
                    });

                    describe('after vacancy enabled', async function () {
                        beforeEach(async function () {
                            await this.employer.disable_vac(this.vacancy_uuid);
                            let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                            assert.isFalse(vacancy[1]);
                        });

                        it('enable vacancy', async function () {
                            await this.employer.enable_vac(this.vacancy_uuid);
                            let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                            assert.isTrue(vacancy[1]);
                        });
                    });
                });
            });
        });
    });

});
