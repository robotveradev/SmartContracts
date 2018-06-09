pragma solidity ^0.4.21;

import './token/Withdrawable.sol';
import './token/ERC20.sol';
import './Oracle.sol';

contract Employer is Withdrawable {

    bytes32 public id;
    ERC20 token;
    Oracle oracle;

    function Employer(bytes32 _id, address _token, address _oracle) public {
        id = _id;
        token = ERC20(_token);
        oracle = Oracle(_oracle);
    }

    function approve_money(uint256 _amount) public onlyOwner {
        token.approve(oracle, _amount);
    }

    function disable_vac(bytes32 _uuid) public onlyOwner {
        oracle.disable_vac(_uuid);
    }

    function enable_vac(bytes32 _uuid) public onlyOwner {
        oracle.enable_vac(_uuid);
    }

    function approve_level_up(bytes32 _vac_uuid, address _candidate) public onlyOwner {
        oracle.approve_level_up(_vac_uuid, _candidate);
    }

    function reset_candidate_action(bytes32 _vac, address _candidate) public onlyOwner {
        oracle.reset_candidate_action(_vac, _candidate);
    }

    function change_vacancy_allowance_amount(bytes32 _vac_uuid, uint256 _allowes) public onlyOwner {
        oracle.change_vacancy_amount(_vac_uuid, _allowes);
    }

    function move_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _from, uint256 _to) public onlyOwner {
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
