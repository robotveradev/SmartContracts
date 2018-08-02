pragma solidity ^0.4.21;

import './ownership/Collaboratorable.sol';
import './math/SafeMath.sol';
import './token/ERC20.sol';
import './Oracle.sol';

contract Company is Collaboratorable {
    ERC20 token;
    Oracle oracle;

    function Company(address _token, address _oracle_address) public {
        token = ERC20(_token);
        oracle = Oracle(_oracle_address);
        oracle.new_company();
    }

    function approve_tokens(uint256 _amount) public onlyOwner {
        token.approve(oracle, _amount);
    }

    function new_collaborator_member(address _member) public onlyOwner {
        require(!collaborators[_member]);
        newCollaborator(_member);
        oracle.new_company_member(_member);
    }

    function del_collaborator_member(address _member) public onlyOwner {
        delCollaborator(_member);
    }

    function new_owner_member(address _member) public onlyOwner {
        require(!owners[_member]);
        newOwner(_member);
        oracle.new_company_member(_member);
    }

    function del_owner_member(address _member) public onlyOwner {
        delOwner(_member);
    }

    function new_member(address _member) public onlyCollaborator {
        oracle.new_company_member(_member);
    }

    function new_vacancy(bytes32 _uuid, uint256 _allowed) public onlyOwner {
        oracle.new_vacancy(_uuid, _allowed);
    }

    function disable_vac(bytes32 _vac_uuid) public onlyOwner {
        oracle.disable_vac(_vac_uuid);
    }

    function enable_vac(bytes32 _vac_uuid) public onlyOwner {
        oracle.enable_vac(_vac_uuid);
    }

    function approve_level_up(bytes32 _vac_uuid, address _member) public onlyCollaborator {
        oracle.approve_level_up(_vac_uuid, _member);
    }

    function reset_member_action(bytes32 _vac_uuid, address _member) public onlyCollaborator {
        oracle.reset_member_action(_vac_uuid, _member);
    }

    function change_vacancy_allowance_amount(bytes32 _vac_uuid, uint256 _allowes) public onlyOwner {
        oracle.change_vacancy_amount(_vac_uuid, _allowes);
    }

    function move_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _from, uint256 _to) public onlyCollaborator {
        oracle.move_vacancy_pipeline_action(_vac_uuid, _from, _to);
    }

    function change_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index, bytes32 _title, uint256 _fee, bool _app) public onlyOwner {
        oracle.change_vacancy_pipeline_action(_vac_uuid, _action_index, _title, _fee, _app);
    }

    function delete_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index) public onlyOwner {
        oracle.delete_vacancy_pipeline_action(_vac_uuid, _action_index);
    }

    function new_vacancy_pipeline_action(bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public onlyOwner {
        oracle.new_vacancy_pipeline_action(_vac_uuid, _title, _fee, _appr);
    }
}
