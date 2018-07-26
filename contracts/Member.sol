pragma solidity ^0.4.21;

import './token/Withdrawable.sol';
import './math/SafeMath.sol';
import './token/ERC20.sol';
import './Oracle.sol';
import './Company.sol';

contract Member is Withdrawable {

    Oracle oracle;

    function Member(address _oracle) public {
        oracle = Oracle(_oracle);
        oracle.new_member();
    }

    function approve_company_tokens(address _company, uint256 _amount) public onlyOwner {
        Company(_company).approve_tokens(_amount);
    }

    function change_status(Oracle.member_status _status) public onlyOwner {
        oracle.change_member_status(_status);
    }

    function subscribe(address _company, bytes32 _vac_uuid) public onlyOwner {
        oracle.subscribe(_company, _vac_uuid);
    }

    function new_collaborator_member(address _company, address _member) public onlyOwner {
        Company(_company).new_collaborator_member(_member);
    }

    function new_owner_member(address _company, address _member) public onlyOwner {
        Company(_company).new_owner_member(_member);
    }

    function new_vacancy(address _company, bytes32 _uuid, uint256 _allowed) public onlyOwner {
        Company(_company).new_vacancy(_uuid, _allowed);
    }

    function disable_vac(address _company, bytes32 _vac_uuid) public onlyOwner {
        Company(_company).disable_vac(_vac_uuid);
    }

    function enable_vac(address _company, bytes32 _vac_uuid) public onlyOwner {
        Company(_company).enable_vac(_vac_uuid);
    }

    function approve_level_up(address _company, bytes32 _vac_uuid, address _member) public onlyOwner {
        Company(_company).approve_level_up(_vac_uuid, _member);
    }

    function reset_member_action(address _company, bytes32 _vac_uuid, address _member) public onlyOwner {
        Company(_company).reset_member_action(_vac_uuid, _member);
    }

    function change_vacancy_allowance_amount(address _company, bytes32 _vac_uuid, uint256 _allowed) public onlyOwner {
        Company(_company).change_vacancy_allowance_amount(_vac_uuid, _allowed);
    }

    function move_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _from, uint256 _to) public onlyOwner {
        Company(_company).move_vacancy_pipeline_action(_vac_uuid, _from, _to);
    }

    function change_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _action_index, bytes32 _title, uint256 _fee, bool _app) public onlyOwner {
        Company(_company).change_vacancy_pipeline_action(_vac_uuid, _action_index, _title, _fee, _app);
    }

    function delete_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _action_index) public onlyOwner {
        Company(_company).delete_vacancy_pipeline_action(_vac_uuid, _action_index);
    }

    function new_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public onlyOwner {
        Company(_company).new_vacancy_pipeline_action(_vac_uuid, _title, _fee, _appr);
    }
}
