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
const Facts = artifacts.require('../Facts.sol');
const Pipeline = artifacts.require('../Pipeline.sol');


const random_bool = () => {
    return Boolean(Math.random() > 0.5)
};
contract('Oracle', function (accounts) {

    const _name = 'Oracle';
    const _service_fee = 5;
    const _beneficiary = accounts[1];
    const other = accounts[2];
    const member = accounts[6];
    const member_2 = accounts[7];
    const member_3 = accounts[8];
    const collaborator = accounts[9];
    const owner = accounts[0];
    const vac_uuid = '0x69e335c4cee26d3443d40556bd798f6dca7b8e12a01d48ea3b8557a1572c6d94';
    const fact_uuid = '0x69e335c4cee26d3443d40556bd798f6dca7b8e12a01d48ea3b8557a1572c6d95';
    const fact_uuid_2 = '0x69e335c4cee26d3443d40556bd798f6dca7b8e12a01d48ea3b8557a1572c6d96';
    let actions = [
        ['one', 100 * 10 ** 18, true],
        ['two', 200 * 10 ** 18, false],
        ['three', 0, true],
    ];

    beforeEach(async function () {
        this.token = await VeraCoin.new();
        this.facts = await Facts.new();
        this.pipeline = await Pipeline.new();
        this.oracle = await Oracle.new(_name, _service_fee, _beneficiary, this.token.address, this.facts.address, this.pipeline.address);

        await this.facts.newOwner(this.oracle.address);
        await this.pipeline.newOwner(this.oracle.address);

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

             it('owner is owner', async function () {
                 let is_owner = await this.oracle.owners(owner);
                 assert.isTrue(is_owner);
             });

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
                    this.member_2 = await Member.new(this.oracle.address, {from: member_2});
                    this.member_3 = await Member.new(this.oracle.address, {from: member_3});
                });

                describe('ability to change status', async function () {

                     it('another can\'t change member status', async function () {
                         await this.member.change_status(1, {from: member_2}).should.be.rejectedWith(EVMRevert);
                     });

                     it('set status to in_search_of_work', async function () {
                         await this.member.change_status(1, {from: member});
                         let new_status = await this.oracle.members_statuses(this.member.address);
                         new_status.should.be.bignumber.equal(1);
                     });

                     it('set status to closed', async function () {
                         await this.member.change_status(2, {from: member});
                         let new_status = await this.oracle.members_statuses(this.member.address);
                         new_status.should.be.bignumber.equal(2);
                     });
                });

                 it('owner can verify member', async function () {
                     await this.oracle.verify_member(this.member.address);
                 });

                 it('another can\'t verify member', async function () {
                     await this.oracle.verify_member(this.member.address, {from: other}).should.be.rejectedWith(EVMRevert);
                 });

                describe('member facts', async function () {

                    beforeEach(async function () {
                        this.fact = {'time': 145142123, 'fact': 'test fact one'};
                        this.fact_2 = {'time': 145142124, 'fact': 'test fact two'};
                    });

                     it('not verified member can add new fact about himself', async function () {
                         await this.member.new_fact(this.member.address, JSON.stringify(this.fact), fact_uuid, {from: member});
                     });

                     it('not verified member can add new fact about another member', async function () {
                         await this.member_2.new_fact(this.member.address, JSON.stringify(this.fact_2), fact_uuid_2, {from: member_2});
                     });

                    describe('after verify member', async function () {

                        beforeEach(async function () {
                            await this.oracle.verify_member(this.member.address, {from: owner});
                            await this.oracle.verify_member(this.member_2.address, {from: owner});
                        });

                         it('members verified', async function () {
                             let member_verified = await this.oracle.member_verified(this.member.address);
                             assert.isTrue(member_verified);
                             let member_2_verified = await this.oracle.member_verified(this.member_2.address);
                             assert.isTrue(member_2_verified);
                         });

                        describe('after add new fact', async function () {

                            beforeEach(async function () {
                                await this.member_2.new_fact(this.member.address, JSON.stringify(this.fact), fact_uuid);
                            });

                             it('verified member can\'t verify fact about himself', async function () {
                                 await this.member.verify_fact(this.member.address, fact_uuid, {from: member}).should.be.rejectedWith(EVMRevert);
                             });

                             it('another verified member can verify fact', async function () {
                                 await this.member_2.verify_fact(this.member.address, fact_uuid, {from: member_2});
                             });

                            describe('after member_2 verify member fact', async function () {
                                beforeEach(async function () {
                                    await this.member_2.verify_fact(this.member.address, fact_uuid, {from: member_2});
                                });

                                 it('member_2 can\'t confirm fact twice', async function () {
                                     await this.member_2.verify_fact(this.member.address, fact_uuid, {from: member_2}).should.be.rejectedWith(EVMRevert);
                                 });

                                 it('member fact has 1 confirmation', async function () {
                                     let conf = await this.oracle.facts_confirmations_count(this.member.address, fact_uuid);
                                     conf.should.be.bignumber.equal(1);
                                 })
                            });


                             it('member have 1 fact', async function () {
                                 let keys_length = await this.oracle.keys_of_facts_length(this.member.address);
                                 keys_length.should.be.bignumber.equal(1);
                             });

                             it('get facts keys', async function () {
                                 let keys = await this.oracle.keys_of_facts(this.member.address);
                                 keys.length.should.be.equal(1);
                                 keys[0].should.be.equal(fact_uuid);
                             });

                             it('get facts key by id', async function () {
                                 let key = await this.oracle.fact_key_by_id(this.member.address, 0);
                                 key.should.be.equal(fact_uuid);
                             });

                            it('get member fact', async function () {
                                let deployed_fact = await this.oracle.get_fact(this.member.address, fact_uuid);
                                deployed_fact[0].should.be.equal(this.member_2.address);
                                JSON.stringify(this.fact).should.be.equal(deployed_fact[2]);
                            });

                            it('member fact is not verified', async function () {
                                let confirmations = await this.oracle.facts_confirmations_count(this.member.address, fact_uuid);
                                confirmations.should.be.bignumber.equal(0);
                            });

                            it('anyone can\'t add confirmation for fact', async function () {
                                await this.oracle.verify_fact(this.member.address, fact_uuid, {from: member_2}).should.be.rejectedWith(EVMRevert);
                            });
                        });
                    });
                });

                 it('members count == 3', async function () {
                     let members = await this.oracle.get_members();
                     members.length.should.be.bignumber.equal(3);
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
                             let member_companies_length = await this.oracle.member_companies_length(this.member.address);
                             member_companies_length.should.be.bignumber.equal(1);
                         });

                         it('member company is correct', async function () {
                             let company_address = await this.oracle.member_company_by_index(this.member.address, 0);
                             company_address.should.be.equal(this.company.address);
                         });

                         it('company has one member', async function () {
                             let company_members_length = await this.oracle.company_members_length(this.company.address);
                             company_members_length.should.be.bignumber.equal(1);
                         });

                         it('company member is correct', async function () {
                             let company_member = await this.oracle.company_member_by_index(this.company.address, 0);
                             company_member.should.be.equal(this.member.address);
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

                                     it('member can\'t subscribe to disabled vacancy', async function () {
                                         await this.member_2.subscribe(this.company.address, vac_uuid, {from: member_2})
                                             .should.be.rejectedWith(EVMRevert);
                                     });

                                    describe('after enabling vacancy', async function () {
                                        beforeEach(async function () {
                                            await this.member.enable_vac(this.company.address, vac_uuid, {from: member});
                                        });

                                         it('vacancy enabled', async function () {
                                             let vac = await this.oracle.vacancies(this.company.address, vac_uuid);
                                             assert.isTrue(vac[0]);
                                         });

                                         it('member can disable vacancy', async function () {
                                             await this.member.disable_vac(this.company.address, vac_uuid, {from: member});
                                             let vac = await this.oracle.vacancies(this.company.address, vac_uuid);
                                             assert.isFalse(vac[0]);
                                         });
                                    });

                                    describe('member subscribing and walk through vacancy pipeline', async function () {

                                        beforeEach(async function () {
                                            for (let i = 0; i < actions.length; i++) {
                                                await this.member.new_vacancy_pipeline_action(this.company.address,
                                                    vac_uuid, ...actions[i], {from: member});
                                            }
                                            await this.member.enable_vac(this.company.address, vac_uuid, {from: member});
                                        });

                                         it('member 2 is not subscribed to vacancy', async function () {
                                             let current_index = await this.oracle.get_member_current_action_index(this.company.address, vac_uuid, this.member_2.address);
                                             current_index.should.be.bignumber.equal(-1);
                                         });

                                         it('member 2 can subscribe to vacancy', async function () {
                                             await this.member_2.subscribe(this.company.address, vac_uuid, {from: member_2});
                                         });

                                         it('oracle can\'t level up not subscribed member', async function () {
                                             await this.oracle.level_up(this.company.address, vac_uuid, this.member_2.address)
                                                 .should.be.rejectedWith(EVMRevert)
                                         });

                                         it('company owner can\'t level up not subscribed member', async function () {
                                             await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member})
                                                 .should.be.rejectedWith(EVMRevert);
                                         });

                                        describe('after member 2 subscribe to vacancy', function () {
                                            beforeEach(async function () {
                                                await this.member_2.subscribe(this.company.address, vac_uuid, {from: member_2});
                                            });

                                             it('already subscribed can\'t subscribe second time', async function () {
                                                 await this.member_2.subscribe(this.company.address, vac_uuid, {from: member_2}).should.be.rejectedWith(EVMRevert);
                                             });

                                             it('member 2 is subscribed to vacancy', async function () {
                                                 let current_index = await this.oracle.get_member_current_action_index(this.company.address, vac_uuid, this.member_2.address);
                                                 current_index.should.be.bignumber.equal(0);
                                             });

                                             it('oracle can\'t level up member (approvable action)', async function () {
                                                 await this.oracle.level_up(this.company.address, vac_uuid, this.member_2.address).should.be.rejectedWith(EVMRevert);
                                             });

                                             it('member 2 has 1 vacancy subscribed to', async function () {
                                                 let member_vacs_len = await this.oracle.member_vacancies_length(this.member_2.address);
                                                 member_vacs_len.should.be.bignumber.equal(1);
                                             });

                                             it('vacancy has 1 member subscribed to', async function () {
                                                 let vacancy_members_len = await this.oracle.vacancy_members_length(this.company.address, vac_uuid);
                                                 vacancy_members_len.should.be.bignumber.equal(1);
                                             });

                                             it('vacancy member correct', async function () {
                                                 let member_address = await this.oracle.members_on_vacancy(this.company.address, vac_uuid, 0);
                                                 member_address.should.be.equal(this.member_2.address);
                                             });

                                             it('member vacancy correct', async function () {
                                                 let vacancy_address = await this.oracle.member_vacancies(this.member_2.address, 0);
                                                 vacancy_address.should.be.equal(vac_uuid);
                                             });

                                             it('company owner can level up member 2', async function () {
                                                 await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member});
                                             });

                                             it('company owner can reset member 2 pipeline position', async function () {
                                                 await this.member.reset_member_action(this.company.address, vac_uuid, this.member_2.address, {from: member});
                                             });

                                            describe('after add company collaborator', async function () {
                                                beforeEach(async function () {
                                                    this.collaborator = await Member.new(this.oracle.address, {from: collaborator});
                                                    await this.member.new_collaborator_member(this.company.address, this.collaborator.address, {from: member});
                                                });

                                                 it('collaborator is collaborator for company', async function () {
                                                     let is_collaborator = await this.company.collaborators(this.collaborator.address);
                                                     assert.isTrue(is_collaborator);
                                                 });

                                                 it('company collaborator can level up member 2', async function () {
                                                     await this.collaborator.approve_level_up(this.company.address,
                                                         vac_uuid, this.member_2.address, {from: collaborator});
                                                 });

                                                 it('company collaborator can reset member pipeline position', async function () {
                                                     await this.collaborator.reset_member_action(this.company.address,
                                                         vac_uuid, this.member_2.address, {from: collaborator});
                                                 });
                                            });

                                            describe('after company spend all tokens', async function () {
                                                beforeEach(async function () {
                                                    await this.member.withdraw_company_tokens(this.token.address, this.company.address, _beneficiary, 5000 * 10 ** 18, {from: member});
                                                });

                                                 it('company has no tokens', async function () {
                                                     let balance = await this.token.balanceOf(this.company.address);
                                                     balance.should.be.bignumber.equal(0);
                                                 });

                                                 it('company owner can\'t level up member 2 without tokens on company', async function () {
                                                     await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member})
                                                         .should.be.rejectedWith(EVMRevert);
                                                 });
                                            });

                                            describe('after level up member 2', async function () {
                                                beforeEach(async function () {
                                                    await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member});
                                                });

                                                 it('member 2 current pipeline action index is 1', async function () {
                                                     let current_index = await this.oracle.get_member_current_action_index(this.company.address, vac_uuid, this.member_2.address);
                                                     current_index.should.be.bignumber.equal(1);
                                                 });

                                                 it('oracle can level member 2 up (not approvable action)', async function () {
                                                     await this.oracle.level_up(this.company.address, vac_uuid, this.member_2.address);
                                                     let current_index = await this.oracle.get_member_current_action_index(this.company.address, vac_uuid, this.member_2.address);
                                                     current_index.should.be.bignumber.equal(2);
                                                 });

                                                 it('member balance 95 VeraCoin', async function () {
                                                     let member_balance = await this.token.balanceOf(this.member_2.address);
                                                     member_balance.should.be.bignumber.equal(95 * 10 ** 18);
                                                 });

                                                describe('after pass vacancy pipeline', async function () {
                                                    beforeEach(async function () {
                                                        await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member});
                                                        await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member});
                                                    });

                                                     it('owner can\'t level up passed member', async function () {
                                                         await this.member.approve_level_up(this.company.address, vac_uuid, this.member_2.address, {from: member})
                                                             .should.be.rejectedWith(EVMRevert);
                                                     });
                                                     it('member 2 pass pipeline', async function () {
                                                         let current_index = await this.oracle.get_member_current_action_index(this.company.address, vac_uuid, this.member_2.address);
                                                         current_index.should.be.bignumber.equal(2);
                                                         let pass_pipeline = await this.oracle.member_vacancy_pass(this.company.address, vac_uuid, this.member_2.address);
                                                         assert.isTrue(pass_pipeline);
                                                     });

                                                     it('member balance 285 Vera Coins', async function () {
                                                         let member_balance = await this.token.balanceOf(this.member_2.address);
                                                         member_balance.should.be.bignumber.equal(285 * 10 ** 18);
                                                     });

                                                     it('vacancy allowed is 200 Vera Coins', async function () {
                                                         let vacancy = await this.oracle.vacancies(this.company.address, vac_uuid);
                                                         vacancy[1].should.be.bignumber.equal(200 * 10 ** 18);
                                                     });

                                                     it('company owner can\'t reset pipeline passed member', async function () {
                                                         await this.member.reset_member_action(this.company.address, vac_uuid, this.member_2.address, {from: member})
                                                             .should.be.rejectedWith(EVMRevert);
                                                     });

                                                     it('company balance is 4700 Vera Coins', async function () {
                                                         let balance = await this.token.balanceOf(this.company.address);
                                                         balance.should.be.bignumber.equal(4700 * 10 ** 18);
                                                     });

                                                     it('company oracle approved tokens is 700 Vera Coins', async function () {
                                                         let approved = await this.token.allowance(this.company.address, this.oracle.address);
                                                         approved.should.be.bignumber.equal(700 * 10 ** 18);
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

                    describe('after cap max pipeline actions', async function () {
                        beforeEach(async function () {
                            await this.member.new_vacancy_pipeline_action(this.company.address, vac_uuid, ...actions[4], {from: member});
                        });

                         it('company owners can\'t add new pipeline action', async function () {
                             await this.member.new_vacancy_pipeline_action(this.company.address, vac_uuid, ...actions[1], {from: member}).should.be.rejectedWith(EVMRevert);
                         });
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
                         });
                    });
                });
            });
        });

    });

});
