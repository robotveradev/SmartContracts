import rep_u0 from './helpers/replace';
import {EVMRevert} from './helpers/EVMRevert';
import {ether} from './helpers/ether';

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const Oracle = artifacts.require('../Oracle.sol');
const VeraCoin = artifacts.require('../token/VeraCoin.sol');

const random_bool = () => {
    return Boolean(Math.random() > 0.5)
};
contract('Oracle', function (accounts) {

    const _name = 'Oracle';
    const _service_fee = 5;
    const _beneficiary = accounts[1];
    const employer = accounts[4];
    const candidate = accounts[5];
    const owner = accounts[0];

    beforeEach(async function () {
        this.token = await VeraCoin.new();
        this.oracle = await Oracle.new(_name, _service_fee, _beneficiary, this.token.address);

        this.check_actions = async function (vacancy_uuid, actions) {
            let pipeline_length = await this.oracle.get_vacancy_pipeline_length(vacancy_uuid);
            for (let i = 0; i < pipeline_length; i++) {
                let cur_action = await this.oracle.vacancy_pipeline(this.vacancy_uuid, i);
                cur_action[0].should.be.bignumber.equal(i);
                rep_u0(web3.toAscii(cur_action[1])).should.be.equal(actions[i][0]);
                cur_action[2].should.be.bignumber.equal(actions[i][1]);
                cur_action[3].should.be.equal(actions[i][2]);
            }
        }
    });
    describe('after deploy contracts', async function () {

        describe('initial state', async function () {

            it('has a name', async function () {
                const name = await this.oracle.name();
                name.should.be.equal(_name);
            });

            it('service fee set', async function () {
                const service_fee = await this.oracle.service_fee();
                service_fee.should.be.bignumber.equal(_service_fee);
            });

            it(`beneficiary must be ${accounts[1]}`, async function () {
                const beneficiary = await this.oracle.beneficiary();
                beneficiary.should.be.equal(_beneficiary);
            });

            it('token address equal real token address', async function () {
                const token = await this.oracle.token();
                token.should.be.equal(this.token.address);
            });

            it('pipeline max length set', async function () {
                const pipeline_max_length = await this.oracle.pipeline_max_length();
                pipeline_max_length.should.be.bignumber.equal(6);
            });
        });

        describe('change contract settings', async function () {

            it('owner can change pipeline max length', async function () {
                await this.oracle.new_pipeline_max_length(10, {from: owner})
            });

            it('another one can\'t change pipeline max length', async function () {
                await this.oracle.new_pipeline_max_length(12, {from: accounts[1]}).should.be.rejectedWith(EVMRevert);
            });

            it('owner can change service fee', async function () {
                await this.oracle.new_service_fee(7, {from: owner});
            });

            it('another one can\'t change service fee', async function () {
                await this.oracle.new_service_fee(7, {from: accounts[1]}).should.be.rejectedWith(EVMRevert);
            });

            it('owner can change beneficiary', async function () {
                await this.oracle.new_beneficiary(accounts[2], {from: owner});
            });

            it('another one can\'t change beneficiary', async function () {
                await this.oracle.new_beneficiary(accounts[2], {from: accounts[1]}).should.be.rejectedWith(EVMRevert);
            });

            describe('after change pipeline max length to 10', async function () {

                beforeEach(async function () {
                    await this.oracle.new_pipeline_max_length(10, {from: owner});
                });

                it('pipeline max length 10', async function () {
                    const pipeline_max_length = await this.oracle.pipeline_max_length();
                    pipeline_max_length.should.be.bignumber.equal(10);
                });
            });

            describe('after change service fee to 7', async function () {

                beforeEach(async function () {
                    await this.oracle.new_service_fee(7, {from: owner});
                });

                it('service fee 7', async function () {
                    const service_fee = await this.oracle.service_fee();
                    service_fee.should.be.bignumber.equal(7);
                });
            });

            describe('after change beneficiary to ' + accounts[2], async function () {

                beforeEach(async function () {
                    await this.oracle.new_beneficiary(accounts[2], {from: owner});
                });

                it('beneficiary is ' + accounts[2], async function () {
                    const beneficiary = await this.oracle.beneficiary();
                    beneficiary.should.be.equal(accounts[2]);
                });
            });
        });

        describe('oracle main', async function () {

            it('owner add new employer', async function () {
                await this.oracle.new_employer(employer, {from: owner})
            });

            it('another one can\'t add new employer', async function () {
                await this.oracle.new_employer(employer, {from: accounts[1]}).should.be.rejectedWith(EVMRevert);
            });

            it('owner add new candidate', async function () {
                await this.oracle.new_candidate(candidate, {from: owner})
            });

            it('another one can\'t add new candidate', async function () {
                await this.oracle.new_candidate(candidate, {from: accounts[1]}).should.be.rejectedWith(EVMRevert);
            });

            describe('after add new employer', async function () {

                beforeEach(async function () {
                    await this.oracle.new_employer(employer, {from: owner});
                });

                it('employers count == 1', async function () {
                    let employers = await this.oracle.get_employers();
                    employers.length.should.be.bignumber.equal(1);
                });

                it('new vacancy', async function () {
                    await this.oracle.new_vacancy(employer, '0xabcd', 100, {from: owner})
                });

                describe('after adding new vacancy', async function () {

                    beforeEach(async function () {
                        await this.oracle.new_vacancy(employer, '0xabcd', 100, {from: owner});
                        this.vacancy_uuid = await this.oracle.employer_vacancy_by_id(employer, 0);
                        this.vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                    });

                    it('employer have one new vacancy', async function () {
                        let vacancies_count = await this.oracle.employer_vacancies_length(employer);
                        vacancies_count.should.be.bignumber.equal(1);
                    });

                    it('correct vacancy uuid', async function () {
                        let vacancies_uuid = await this.oracle.employer_vacancies(employer);
                        vacancies_uuid[0].should.be.equal(this.vacancy_uuid);
                    });

                    it('vacancy allowed amount set to 100', async function () {
                        this.vacancy[2].should.be.bignumber.equal(100);
                    });

                    it('employer can change vacancy allowed amount', async function () {
                        await this.oracle.change_vacancy_amount(this.vacancy_uuid, 1000, {from: employer});
                    });

                    describe('after change vacancy allowed amount', async function () {
                        beforeEach(async function () {
                            await this.oracle.change_vacancy_amount(this.vacancy_uuid, 1000, {from: employer});
                        });

                        it('vacancy allowed amount = 1000', async function () {
                            let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                            vacancy[2].should.be.bignumber.equal(1000);
                        });
                    });

                    it('employer can enable vacancy', async function () {
                        await this.oracle.enable_vac(this.vacancy_uuid, {from: employer});
                    });

                    describe('after change vacancy enabled to true', async function () {
                        beforeEach(async function () {
                            await this.oracle.enable_vac(this.vacancy_uuid, {from: employer});
                        });

                        it('vacancy enabled', async function () {
                            let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                            assert.isTrue(vacancy[1]);
                        });

                        it('employer can disable vacancy', async function () {
                            await this.oracle.disable_vac(this.vacancy_uuid, {from: employer});
                            let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                            assert.isFalse(vacancy[1]);
                        });
                    });

                    it('another one can\'t change vacancy allowed amount', async function () {
                        await this.oracle.change_vacancy_amount(this.vacancy_uuid, 1000, {from: accounts[9]}).should.be.rejectedWith(EVMRevert);
                    });

                    it('vacancy disabled', async function () {
                        assert.isFalse(this.vacancy[1]);
                    });

                    it('oracle owner do not have permissions to add pipeline actions for vacancy', async function () {
                        await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, 'Wait', 2, true, {from: owner}).should.be.rejectedWith(EVMRevert);
                    });

                    it('employer have permissions to add pipeline actions', async function () {
                        await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, 'Wait', 2, true, {from: employer});
                    });

                    describe('after add pipeline action', async function () {

                        beforeEach(async function () {
                            await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, 'Wait', 2, true, {from: employer});
                        });

                        it('vacancy pipeline length = 1', async function () {
                            let pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                            pipeline_length.should.be.bignumber.equal(1);
                        });

                        it('action correct', async function () {
                            let action = await this.oracle.vacancy_pipeline(this.vacancy_uuid, 0);
                            action[0].should.be.bignumber.equal(0);
                            rep_u0(web3.toAscii(action[1])).should.be.equal('Wait');
                            action[2].should.be.bignumber.equal(2);
                            assert.isTrue(action[3]);
                        });
                    });

                    describe('add actions more than 3 (pipeline max length)', async function () {

                        beforeEach(async function () {
                            await this.oracle.new_pipeline_max_length(3, {from: owner});
                            this.length = await this.oracle.pipeline_max_length();
                            this.length.should.be.bignumber.equal(3);
                        });

                        it(`add 3 actions`, async function () {
                            for (let i = 0; i < this.length.toString(); i++) {
                                await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, `Wait${i}`, 2, random_bool(), {from: employer});
                            }
                            let vacancy_pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                            vacancy_pipeline_length.should.be.bignumber.equal(3);
                        });

                        it('fourth action rejected', async function () {
                            for (let i = 0; i < this.length.toString(); i++) {
                                await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, `Wait${i}`, 2, random_bool(), {from: employer});
                            }
                            await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, `Wait`, 2, random_bool(), {from: employer}).should.be.rejectedWith(EVMRevert);
                            let vacancy_pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                            vacancy_pipeline_length.should.be.bignumber.equal(3);
                        });

                        describe('actions with pipeline actions', async function () {
                            const actions = [
                                ['one', 110, true],
                                ['two', 120, false],
                                ['three', 130, true],
                                ['four', 140, false,],
                                ['five', 150, true],
                            ];

                            beforeEach(async function () {
                                await this.oracle.new_pipeline_max_length(5, {from: owner});
                                this.length = await this.oracle.pipeline_max_length();
                                this.length.should.be.bignumber.equal(5);
                                for (let i = 0; i < this.length.toString() - 1; i++) {
                                    await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, actions[i][0], actions[i][1], actions[i][2], {from: employer});
                                }
                            });

                            it('pipeline actions correct', async function () {
                                await this.check_actions(this.vacancy_uuid, actions.slice(0, 4));
                            });

                            it('change action', async function () {
                                let new_actions = actions;
                                let new_action = ['new_one', 1000, false];
                                new_actions[2] = new_action;
                                await this.oracle.change_vacancy_pipeline_action(this.vacancy_uuid, 2, ...new_action, {from: employer});
                                await this.check_actions(this.vacancy_uuid, new_actions);
                            });

                            it('change action with index more than length rejected', async function () {
                                let new_action = ['new_one', 1000, false];
                                await this.oracle.change_vacancy_pipeline_action(this.vacancy_uuid, 20, ...new_action, {from: employer}).should.be.rejectedWith(EVMRevert);
                            });

                            it('append new pipeline action', async function () {
                                await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, ...actions[4], {from: employer});
                                await this.check_actions(this.vacancy_uuid, actions);
                            });

                            it('delete pipeline action', async function () {
                                let actions_without_deleted = actions.slice(0, 2).concat(actions.slice(3, 5));
                                await this.oracle.delete_vacancy_pipeline_action(this.vacancy_uuid, 2, {from: employer});
                                await this.check_actions(this.vacancy_uuid, actions_without_deleted);
                            });

                            it('delete pipeline action with index more that length rejeted', async function () {
                                await this.oracle.delete_vacancy_pipeline_action(this.vacancy_uuid, 15, {from: employer}).should.be.rejectedWith(EVMRevert);
                            });

                            describe('shake pipeline actions', async function () {
                                it('same action position', async function () {
                                    await this.oracle.move_vacancy_pipeline_action(this.vacancy_uuid, 0, 0, {from: employer});
                                    await this.check_actions(this.vacancy_uuid, actions);
                                });

                                it('move pipeline action at the end of pipeline', async function () {
                                    let shaked = actions;
                                    [shaked[1], shaked[2]] = [shaked[2], shaked[1]];
                                    await this.oracle.move_vacancy_pipeline_action(this.vacancy_uuid, 1, 2, {from: employer});
                                    await this.check_actions(this.vacancy_uuid, shaked);
                                });

                                it('move pipeline action to the top of pipeline', async function () {
                                    let shaked = actions;
                                    [shaked[3], shaked[2]] = [shaked[2], shaked[3]];
                                    await this.oracle.move_vacancy_pipeline_action(this.vacancy_uuid, 3, 2, {from: employer});
                                    await this.check_actions(this.vacancy_uuid, shaked);
                                });

                                it('move at non in length position rejected', async function () {
                                    await this.oracle.move_vacancy_pipeline_action(this.vacancy_uuid, 1, 10, {from: employer}).should.be.rejectedWith(EVMRevert);
                                })
                            });
                        });
                    });
                });
            });
        });

        describe('after add new candidate', async function () {

            const fact = {'time': 145142123, 'fact': 'test fact one', 'sender': employer};

            beforeEach(async function () {
                await this.oracle.new_candidate(candidate, {from: owner});
            });

            it('candidates count is 1', async function () {
                let candidates = await this.oracle.get_candidates();
                candidates.length.should.be.bignumber.equal(1);
            });

            describe('candidate facts', async function () {

                it('ability to add new candidate fact', async function () {
                    await this.oracle.new_fact(candidate, JSON.stringify(fact), {from: owner});
                });

                describe('after add new fact', async function () {

                    beforeEach(async function () {
                        let result = await this.oracle.new_fact(candidate, JSON.stringify(fact), {from: owner});
                        assert.equal(result.logs[0].event, 'NewFact');
                        this.new_fact_id = result.logs[0].args['id'];
                    });

                    it('candidate have 1 fact', async function () {
                        let keys_length = await this.oracle.keys_of_facts_length(candidate);
                        keys_length.should.be.bignumber.equal(1);
                    });

                    it('get facts keys', async function () {
                        let keys = await this.oracle.keys_of_facts(candidate);
                        keys.length.should.be.equal(1);
                        keys[0].should.be.equal(this.new_fact_id);
                    });

                    it('get facts key by id', async function () {
                        let key = await this.oracle.fact_key_by_id(candidate, 0);
                        key.should.be.equal(this.new_fact_id);
                    });

                    it('get candidate fact', async function () {
                        let deployed_fact = await this.oracle.get_fact(candidate, this.new_fact_id);
                        deployed_fact[0].should.be.equal(owner);
                        JSON.stringify(fact).should.be.equal(deployed_fact[2]);
                    });
                });
            });

            it('candidate have open_to_suggestions status', async function () {
                let status = await this.oracle.candidate_statuses(candidate);
                status.should.be.bignumber.equal(0);
            });

            describe('ability to change status', async function () {

                it('set status to in_search_of_work', async function () {
                    await this.oracle.change_candidate_status(candidate, 1);
                    let new_status = await this.oracle.candidate_statuses(candidate);
                    new_status.should.be.bignumber.equal(1);
                });

                it('set status to closed', async function () {
                    await this.oracle.change_candidate_status(candidate, 2);
                    let new_status = await this.oracle.candidate_statuses(candidate);
                    new_status.should.be.bignumber.equal(2);
                });
            });

        });

        describe('create new vacancy', async function () {
            let actions = [
                ['one', 100 * 10 ** 18, true],
                ['two', 200 * 10 ** 18, false],
                ['three', 0, true],
            ];
            beforeEach(async function () {
                await this.oracle.new_employer(employer, {from: owner});
                await this.oracle.new_vacancy(employer, '0xabcd', 5000 * 10 ** 18, {from: owner});
                let vacancies_uuid = await this.oracle.employer_vacancies(employer);
                this.vacancy_uuid = vacancies_uuid[0];
                for (let i = 0; i < 3; i++) {
                    await this.oracle.new_vacancy_pipeline_action(this.vacancy_uuid, actions[i][0], actions[i][1], actions[i][2], {from: employer});
                }
            });

            it('oracle can\'t level up not subscribed candidate', async function () {
                await this.oracle.level_up(this.vacancy_uuid, candidate, {from: owner}).should.be.rejectedWith(EVMRevert);
            });

            it('employer can\'t level up not subscribed candidate', async function () {
                await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
            });

            describe('after add new employer with new vacancy and pipeline actions', async function () {

                it('candidate can\'t subscribe to disabled vacancy', async function () {
                    await this.oracle.subscribe(this.vacancy_uuid, {from: candidate}).should.be.rejectedWith(EVMRevert);
                });

                it('candidate can subscribe to enabled vacancy', async function () {
                    await this.oracle.enable_vac(this.vacancy_uuid, {from: employer});
                    await this.oracle.subscribe(this.vacancy_uuid, {from: candidate});
                });

                describe('after subscribe', async function () {

                    beforeEach(async function () {
                        await this.oracle.enable_vac(this.vacancy_uuid, {from: employer});
                        await this.oracle.subscribe(this.vacancy_uuid, {from: candidate});
                    });

                    it('candidate have one vacancy subscribed to', async function () {
                        let count = await this.oracle.candidate_vacancies_length(candidate);
                        count.should.be.bignumber.equal(1);
                    });

                    it('vacancy have one candidate subscribed to', async function () {
                        let count = await this.oracle.vacancy_candidates_length(this.vacancy_uuid);
                        count.should.be.bignumber.equal(1);
                    });

                    it('already subscribed can\'t subscribe second time', async function () {
                        await this.oracle.subscribe(this.vacancy_uuid, {from: candidate}).should.be.rejectedWith(EVMRevert);
                    });

                    it('current candidate action index is 0', async function () {
                        let action_index = await this.oracle.get_candidate_current_action_index(this.vacancy_uuid, candidate);
                        action_index.should.be.bignumber.equal(0);
                    });

                    it('oracle can\'t level candidate up (approvable action)', async function () {
                        await this.oracle.level_up(this.vacancy_uuid, candidate).should.be.rejectedWith(EVMRevert);
                    });

                    it('employer without tokens can\'t level candidate up (approvable action)', async function () {
                        await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
                    });

                    describe('after tokens to employer', async function () {
                        beforeEach(async function () {
                            let value = 10000 * 10 ** 18;
                            await this.token.transfer(employer, value, {from: owner});
                        });

                        it('employer can\'t level up candidate without approve tokens for oracle', async function () {
                            await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
                        });
                    });

                    describe('after transfer tokens for employer', async function () {
                        beforeEach(async function () {
                            let value = 10000 * 10 ** 18;
                            await this.token.transfer(employer, value, {from: owner});
                            await this.token.approve(this.oracle.address, value, {from: employer});
                        });

                        it('change allowance to 100', async function () {
                            await this.token.approve(this.oracle.address, 100, {from: employer}).should.be.rejectedWith(EVMRevert);
                        });

                        describe('after change vacancy allowance to 0', async function () {

                            beforeEach(async function () {
                                await this.oracle.change_vacancy_amount(this.vacancy_uuid, 0, {from: employer});
                            });

                            it('vacancy allowed amount is 0', async function () {
                                let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                                vacancy[2].should.be.bignumber.equal(0);
                            });

                            it('employer can\'t level up candidate with vacancy allowed amount == 0', async function () {
                                await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
                            });
                        });

                        it('employer with tokens approved for oracle can level up candidate', async function () {
                            await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                        });

                        describe('after employer level up candidate', async function () {
                            beforeEach(async function () {
                                await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                            });

                            it('candidate current action index is 1', async function () {
                                let cur_action = await this.oracle.get_candidate_current_action_index(this.vacancy_uuid, candidate);
                                cur_action.should.be.bignumber.equal(1);
                            });

                            it('candidate balance is 95 (100 - 5%)', async function () {
                                let can_balance = await this.token.balanceOf(candidate);
                                can_balance.should.be.bignumber.equal(95 * 10 ** 18);
                            });

                            it('beneficiary balance is 5 (5%)', async function () {
                                let ben_balance = await this.token.balanceOf(_beneficiary);
                                ben_balance.should.be.bignumber.equal(5 * 10 ** 18);
                            });

                            it('vacancy allowed reduced by 100', async function () {
                                let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                                vacancy[2].should.be.bignumber.equal(4900 * 10 ** 18);
                            });

                            it('employer balance reduced by 100', async function () {
                                let emp_balance = await this.token.balanceOf(employer);
                                emp_balance.should.be.bignumber.equal(9900 * 10 ** 18);
                            });

                            it('employer allowance to oralce reduced by 100', async function () {
                                let emp_allowance_to_oracle = await this.token.allowance(employer, this.oracle.address);
                                emp_allowance_to_oracle.should.be.bignumber.equal(9900 * 10 ** 18);
                            });

                            it('level up on disabled vacancy rejected', async function () {
                                await this.oracle.disable_vac(this.vacancy_uuid, {from: employer});
                                await this.oracle.level_up(this.vacancy_uuid, candidate).should.be.rejectedWith(EVMRevert);
                            });

                            describe('employer delete actions', async function () {

                                beforeEach(async function () {
                                    await this.oracle.delete_vacancy_pipeline_action(this.vacancy_uuid, 2, {from: employer});
                                    await this.oracle.delete_vacancy_pipeline_action(this.vacancy_uuid, 1, {from: employer});
                                });

                                it('pipeline length is 1', async function () {
                                    let vacancy_pipeline_length = await this.oracle.get_vacancy_pipeline_length(this.vacancy_uuid);
                                    vacancy_pipeline_length.should.be.bignumber.equal(1);
                                });

                                it('candidate current action index is 1', async function () {
                                    let cur_action = await this.oracle.get_candidate_current_action_index(this.vacancy_uuid, candidate);
                                    cur_action.should.be.bignumber.equal(1);
                                });

                                it('level up candidate with current action index > pipeline length', async function () {
                                    await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                                });

                                describe('after level up candidate with current action index more than pipeline length', async function () {
                                    beforeEach(async function () {
                                        await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                                    });

                                    it('candidate have vacancy passed status', async function () {
                                        let candidate_vacancy_pass = await this.oracle.vacancy_candidate_pass(this.vacancy_uuid, candidate);
                                        assert.isTrue(candidate_vacancy_pass);
                                    });
                                })
                            });

                            describe('after candidate level up to first action', async function () {

                                beforeEach(async function () {
                                    await this.oracle.level_up(this.vacancy_uuid, candidate, {from: owner});
                                });

                                it('oracle level up candidate (not approvable action)', async function () {
                                    let cur_action = await this.oracle.get_candidate_current_action_index(this.vacancy_uuid, candidate);
                                    cur_action.should.be.bignumber.equal(2);
                                });

                                it('check balances', async function () {
                                    let can_balance = await this.token.balanceOf(candidate);
                                    can_balance.should.be.bignumber.equal(285 * 10 ** 18);
                                    let ben_balance = await this.token.balanceOf(_beneficiary);
                                    ben_balance.should.be.bignumber.equal(15 * 10 ** 18);
                                    let vacancy = await this.oracle.vacancies(this.vacancy_uuid);
                                    vacancy[2].should.be.bignumber.equal(4700 * 10 ** 18);
                                    let emp_balance = await this.token.balanceOf(employer);
                                    emp_balance.should.be.bignumber.equal(9700 * 10 ** 18);
                                    let emp_allowance_to_oracle = await this.token.allowance(employer, this.oracle.address);
                                    emp_allowance_to_oracle.should.be.bignumber.equal(9700 * 10 ** 18);
                                });

                                it('employer can level up candidate (not approvable)', async function () {
                                    await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                                });

                                it('employer can reset candidate action', async function () {
                                    await this.oracle.reset_candidate_action(this.vacancy_uuid, candidate, {from: employer});
                                });

                                describe('add some candidates', async function () {
                                    beforeEach(async function () {
                                        for (let i = 6; i < 9; i++) {
                                            await this.oracle.new_candidate(accounts[i], {from: owner});
                                            await this.oracle.subscribe(this.vacancy_uuid, {from: accounts[i]});
                                        }
                                    });

                                    it('four candidates subscribed to vacancy', async function () {
                                        let candidates_on_vacancy = await this.oracle.vacancy_candidates_length(this.vacancy_uuid);
                                        candidates_on_vacancy.should.be.bignumber.equal(4);
                                    });

                                    it('revoke candidate', async function () {
                                        await this.oracle.reset_candidate_action(this.vacancy_uuid, accounts[7], {from: employer});
                                    });
                                });

                                describe('after end pipeline', async function () {
                                    beforeEach(async function () {
                                        await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer});
                                    });

                                    it('candidate have vacancy passed status', async function () {
                                        let cur = await this.oracle.get_candidate_current_action_index(this.vacancy_uuid, candidate);
                                        let pass = await this.oracle.vacancy_candidate_pass(this.vacancy_uuid, candidate);
                                        cur.should.be.bignumber.equal(2);
                                        assert.isTrue(pass);
                                    });

                                    it('no one can level up already passed candidate', async function () {
                                        await this.oracle.level_up(this.vacancy_uuid, candidate, {from: owner}).should.be.rejectedWith(EVMRevert);
                                        await this.oracle.approve_level_up(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
                                    });

                                    it('passed candidate can\'t be reset', async function () {
                                        await this.oracle.reset_candidate_action(this.vacancy_uuid, candidate, {from: employer}).should.be.rejectedWith(EVMRevert);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

});
