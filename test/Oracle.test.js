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
const Company = artifacts.require('../Company.sol');
const Member = artifacts.require('../Member.sol');


const random_bool = () => {
    return Boolean(Math.random() > 0.5)
};
contract('Oracle', function (accounts) {

    const _name = 'Oracle';
    const _service_fee = 5;
    const _beneficiary = accounts[1];
    const other = accounts[2];
    const member = accounts[7];
    const member_2 = accounts[8];
    const owner = accounts[0];
    const vac_uuid = '0x69e335c4cee26d3443d40556bd798f6dca7b8e12a01d48ea3b8557a1572c6d94';
    let actions = [
        ['one', 100 * 10 ** 18, true],
        ['two', 200 * 10 ** 18, false],
        ['three', 0, true],
    ];

    beforeEach(async function () {
        this.token = await VeraCoin.new();
        this.oracle = await Oracle.new(_name, _service_fee, _beneficiary, this.token.address);

        this.check_actions = async function (company_address, vacancy_uuid, actions) {
            let pipeline_length = await this.oracle.get_vacancy_pipeline_length(company_address, vacancy_uuid);
            for (let i = 0; i < pipeline_length; i++) {
                let cur_action = await this.oracle.vacancy_pipeline(company_address, vacancy_uuid, i);
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

            it('anyone may add new member', async function () {
                await this.oracle.new_member({from: member});
                await this.oracle.new_member({from: member_2});
            });

            describe('after add new member', async function () {

                beforeEach(async function () {
                    this.member = await Member.new(this.oracle.address, {from: member});
                });

                it('members count == 1', async function () {
                    let members = await this.oracle.get_members();
                    members.length.should.be.bignumber.equal(1);
                });

                it('member address is correct', async function () {
                    let members = await this.oracle.get_members();
                    members[0].should.be.equal(this.member.address);
                });

                describe('after adding new company', async function () {

                    beforeEach(async function () {
                        this.company = await Company.new(this.token.address, this.oracle.address);
                    });

                    it('oracle has 1 new company', async function () {
                        let companies = await this.oracle.get_companies();
                        companies.length.should.be.bignumber.equal(1);
                    });

                    it('new company address is correct', async function () {
                        let companies = await this.oracle.get_companies();
                        companies[0].should.be.equal(this.company.address);
                    });

                    it('oracle is owner for company contract', async function () {
                        let is_owner = await this.company.owners(owner);
                        assert.isTrue(is_owner);
                    });

                    it('another is not owner for company contract', async function () {
                        let is_owner = await this.company.owners(other);
                        assert.isFalse(is_owner);
                    });

                    describe('after add member to company', async function () {
                        beforeEach(async function () {
                            await this.company.new_owner_member(this.member.address);
                        });

                        it('member is owner for company', async function () {
                            let is_owner = await this.company.owners(this.member.address);
                            assert.isTrue(is_owner);
                        });

                        it('member has one company', async function () {
                            let member_companies = await this.oracle.get_member_companies(this.member.address);
                            member_companies.length.should.be.bignumber.equal(1);
                        });

                        it('member company is correct', async function () {
                            let company_address = await this.oracle.member_company_by_index(this.member.address, 0);
                            company_address.should.be.equal(this.company.address);
                        });

                        it('company has one member', async function () {
                            let company_members = await this.oracle.get_company_members(this.company.address);
                            company_members.length.should.be.bignumber.equal(1);
                        });

                        it('company member is correct', async function () {
                            let company_members = await this.oracle.get_company_members(this.company.address);
                            company_members[0].should.be.equal(this.member.address);
                        });

                        describe('after transfer tokens at company address', async function () {
                            beforeEach(async function () {
                                await this.token.transfer(this.company.address, 5000 * 10 ** 18);
                            });

                            it('company balance is 5000', async function () {
                                let balance = await this.token.balanceOf(this.company.address);
                                balance.should.be.bignumber.equal(5000 * 10 ** 18);
                            });

                            it('member can approve tokens from company to oracle', async function () {
                                await this.member.approve_company_tokens(this.company.address, 1000 * 10 ** 18, {from: member});
                            });

                            it('another cannot approve tokens from company to oracle', async function () {
                                await this.member.approve_company_tokens(this.company.address, 1000 * 10 ** 18, {from: member_2})
                                    .should.be.rejectedWith(EVMRevert);
                            });

                            describe('after approving tokens for oracle', async function () {
                                beforeEach(async function () {
                                    await this.member.approve_company_tokens(this.company.address, 1000 * 10 ** 18, {from: member});
                                });

                                it('oracle allowance is 1000', async function () {
                                    let allowed = await this.token.allowance(this.company.address, this.oracle.address);
                                    allowed.should.be.bignumber.equal(1000 * 10 ** 18);
                                });

                                it('member can create vacancy at company', async function () {
                                    await this.member.new_vacancy(this.company.address, '0x123', 500 * 10 ** 18, {from: member});
                                });

                                it('another one can\'t create vacancy at this company', async function () {
                                    await this.member.new_vacancy(this.company.address, '0x123', 500 * 10 ** 18, {from: member_2})
                                        .should.be.rejectedWith(EVMRevert);
                                });

                                describe('after member add new vacancy', async function () {
                                    beforeEach(async function () {
                                        await this.member.new_vacancy(this.company.address, vac_uuid, 500 * 10 ** 18, {from: member});
                                    });

                                    it('company has one vacancy', async function () {
                                        let company_vacs_count = await this.oracle.company_vacancies_length(this.company.address);
                                        company_vacs_count.should.be.bignumber.equal(1);
                                    });

                                    it('vacancy uuid correct', async function () {
                                        let company_vacs = await this.oracle.company_vacancies(this.company.address);
                                        company_vacs[0].should.be.equal(vac_uuid);
                                    });

                                    it('vacancy disabled and allowed correct', async function () {
                                        let vac = await this.oracle.vacancies(this.company.address, vac_uuid);
                                        assert.isFalse(vac[0]);
                                        vac[1].should.be.bignumber.equal(500 * 10 ** 18);
                                    });

                                    it('member owner can change vacancy allowed', async function () {
                                        await this.member.change_vacancy_allowance_amount(this.company.address, vac_uuid, 100, {from: member});
                                        let vac = await this.oracle.vacancies(this.company.address, vac_uuid);
                                        vac[1].should.be.bignumber.equal(100);
                                    });

                                    it('member owner can enable vacancy', async function () {
                                        await this.member.enable_vac(this.company.address, vac_uuid, {from: member});
                                        let vac = await this.oracle.vacancies(this.company.address, vac_uuid);
                                        assert.isTrue(vac[0]);
                                    });

                                });

                            });
                        });
                    });
                });

            });
            describe('vacancy pipeline', function () {
                beforeEach(async function () {
                    this.member = await Member.new(this.oracle.address, {from: member});
                    this.company = await Company.new(this.token.address, this.oracle.address);
                    await this.company.new_owner_member(this.member.address);
                    await this.member.new_vacancy(this.company.address, vac_uuid, 500 * 10 ** 18, {from: member});
                });

                it('owner member can add new vacancy pipeline action', async function () {
                    for (let i = 0; i < actions; i++) {
                        await this.member.new_vacancy_pipeline_action(this.company.address,
                            vac_uuid, actions[i][0], actions[i][1], actions[i][2], {from: member});
                    }
                });

                it('another cannot add pipeline action at this vacancy', async function () {
                    await this.member.new_vacancy_pipeline_action(this.company.address,
                        vac_uuid, 'Four', 100, true, {from: member_2}).should.be.rejectedWith(EVMRevert);
                });

                it('actions correct', async function () {
                    await this.check_actions(this.company.address, vac_uuid, actions);
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
                            await this.member.new_vacancy_pipeline_action(this.company.address,
                                vac_uuid, actions[i][0], actions[i][1], actions[i][2], {from: member});
                        }
                    });

                    it('pipeline actions correct', async function () {
                        await this.check_actions(vac_uuid, actions.slice(0, 4));
                    });

                    it('change action', async function () {
                        let new_actions = actions;
                        let new_action = ['new_one', 1000, false];
                        new_actions[2] = new_action;
                        await this.member.change_vacancy_pipeline_action(this.company.address, vac_uuid, 2, ...new_action, {from: member});
                        await this.check_actions(this.company.address, vac_uuid, new_actions);
                    });

                    it('change action with index more than length rejected', async function () {
                        let new_action = ['new_one', 1000, false];
                        await this.member.change_vacancy_pipeline_action(this.company.address, vac_uuid, 20, ...new_action, {from: member}).should.be.rejectedWith(EVMRevert);
                    });

                    it('append new pipeline action', async function () {
                        await this.member.new_vacancy_pipeline_action(this.company.address, vac_uuid, ...actions[4], {from: member});
                        await this.check_actions(this.company.address, vac_uuid, actions);
                    });

                    it('delete pipeline action', async function () {
                        let actions_without_deleted = actions.slice(0, 2).concat(actions.slice(3, 5));
                        await this.member.delete_vacancy_pipeline_action(this.company.address, vac_uuid, 2, {from: member});
                        await this.check_actions(this.company.address, vac_uuid, actions_without_deleted);
                    });

                    it('delete pipeline action with index more that length rejeted', async function () {
                        await this.member.delete_vacancy_pipeline_action(this.company.address, vac_uuid, 15, {from: member}).should.be.rejectedWith(EVMRevert);
                    });

                    describe('shake pipeline actions', async function () {
                        it('same action position', async function () {
                            await this.member.move_vacancy_pipeline_action(this.company.address, vac_uuid, 0, 0, {from: member});
                            await this.check_actions(this.company.address, vac_uuid, actions);
                        });

                        it('move pipeline action at the end of pipeline', async function () {
                            let shaked = actions;
                            [shaked[1], shaked[2]] = [shaked[2], shaked[1]];
                            await this.member.move_vacancy_pipeline_action(this.company.address, vac_uuid, 1, 2, {from: member});
                            await this.check_actions(this.company.address, vac_uuid, shaked);
                        });

                        it('move pipeline action to the top of pipeline', async function () {
                            let shaked = actions;
                            [shaked[3], shaked[2]] = [shaked[2], shaked[3]];
                            await this.member.move_vacancy_pipeline_action(this.company.address, vac_uuid, 3, 2, {from: member});
                            await this.check_actions(this.company.address, vac_uuid, shaked);
                        });

                        it('move at non in length position rejected', async function () {
                            await this.member.move_vacancy_pipeline_action(this.company.address, vac_uuid, 1, 10, {from: member}).should.be.rejectedWith(EVMRevert);
                        })
                    });
                });
            });
        });

    });

});
