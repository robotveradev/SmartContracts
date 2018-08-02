pragma solidity ^0.4.21;

import './ownership/Ownable.sol';

contract Pipeline is Ownable {

    struct Action {
        uint256 id;
        bytes32 title;
        uint256 fee;
        bool approvable;
    }

    uint256 public pipeline_max_length;

     // company address => vacancy uuid => vacancy pipeline
    mapping(address => mapping(bytes32 => Action[])) public vacancy_pipeline;

    event NewAction(address company, bytes32 uuid);

    event NewPipelineMaxLength(address sender, uint256 count);

    function Pipeline() public {
        pipeline_max_length = 6;
    }

    function get_action_id(address _company, bytes32 _vac_uuid, uint256 _index) public view returns (uint256) {
        return vacancy_pipeline[_company][_vac_uuid][_index].id;
    }

    function get_action_title(address _company, bytes32 _vac_uuid, uint256 _index) public view returns (bytes32) {
        return vacancy_pipeline[_company][_vac_uuid][_index].title;
    }

    function get_action_fee(address _company, bytes32 _vac_uuid, uint256 _index) public view returns (uint256) {
        return vacancy_pipeline[_company][_vac_uuid][_index].fee;
    }

    function get_action_approvable(address _company, bytes32 _vac_uuid, uint256 _index) public view returns (bool) {
        return vacancy_pipeline[_company][_vac_uuid][_index].approvable;
    }

    function new_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public onlyOwner {
        uint256 new_index = get_vacancy_pipeline_length(_company, _vac_uuid);
        require(new_index < pipeline_max_length);
        vacancy_pipeline[_company][_vac_uuid].push(Action(new_index, _title, _fee, _appr));
        emit NewAction(_company, _vac_uuid);
    }

    function change_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _action_index,
        bytes32 _title,uint256 _fee, bool _app) public onlyOwner {
        require(_action_index < get_vacancy_pipeline_length(_company, _vac_uuid));
        vacancy_pipeline[_company][_vac_uuid][_action_index] = Action(_action_index, _title, _fee, _app);
    }

    function delete_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _action_index) public onlyOwner {
        uint256 pipeline_length = get_vacancy_pipeline_length(_company, _vac_uuid);
        require(_action_index < pipeline_length);
        delete vacancy_pipeline[_company][_vac_uuid][_action_index];
        for (uint256 i = _action_index; i < pipeline_length - 1; i++) {
            vacancy_pipeline[_company][_vac_uuid][i] = vacancy_pipeline[_company][_vac_uuid][i + 1];
            vacancy_pipeline[_company][_vac_uuid][i].id = vacancy_pipeline[_company][_vac_uuid][i].id - 1;
        }
        vacancy_pipeline[_company][_vac_uuid].length--;
    }

    function move_vacancy_pipeline_action(address _company, bytes32 _vac_uuid, uint256 _from_pos, uint256 _to_pos) public onlyOwner {
        if (_from_pos == _to_pos) {
            return;
        }
        uint256 pipeline_length = get_vacancy_pipeline_length(_company, _vac_uuid);
        require(_from_pos < pipeline_length && _to_pos < pipeline_length);
        Action memory act = vacancy_pipeline[_company][_vac_uuid][_from_pos];
        uint256 i;
        if (_from_pos > _to_pos) {
            for (i = _from_pos; i > _to_pos; i--) {
                vacancy_pipeline[_company][_vac_uuid][i] = vacancy_pipeline[_company][_vac_uuid][i - 1];
                vacancy_pipeline[_company][_vac_uuid][i].id = vacancy_pipeline[_company][_vac_uuid][i].id + 1;
            }
        } else {
            for (i = _from_pos; i < _to_pos; i++) {
                vacancy_pipeline[_company][_vac_uuid][i] = vacancy_pipeline[_company][_vac_uuid][i + 1];
                vacancy_pipeline[_company][_vac_uuid][i].id = vacancy_pipeline[_company][_vac_uuid][i].id - 1;
            }
        }
        act.id = _to_pos;
        vacancy_pipeline[_company][_vac_uuid][_to_pos] = act;
    }

    function get_vacancy_pipeline_length(address _company, bytes32 _uuid) public view returns (uint256) {
        return vacancy_pipeline[_company][_uuid].length;
    }

    function new_pipeline_max_length(uint256 _new_max) public onlyOwner {
        pipeline_max_length = _new_max;
        emit NewPipelineMaxLength(msg.sender, _new_max);
    }
}
