pragma solidity ^0.4.21;

import './ownership/Ownable.sol';
import './math/SafeMath.sol';
import './token/ERC20.sol';

contract Oracle is Ownable {
    using SafeMath for uint256;

    string public name;
    address public beneficiary;
    ERC20 public token;

    enum candidate_status {open_to_suggestions, in_search_of_work, closed}

    address[] employers;

    address[] candidates;

    uint8 public service_fee;

    uint256 public pipeline_max_length;

    struct Action {
        uint256 id;
        bytes32 title;
        uint256 fee;
        bool approvable;
    }

    struct Vacancy {
        address keeper;
        bool enabled;
        uint allowed;
    }

    // vacancy uuid => vacancy
    mapping(bytes32 => Vacancy) public vacancies;

    // Vacancy uuid => vacancy pipeline
    mapping(bytes32 => Action[]) public vacancy_pipeline;

    // vacancy uuid => candidate addresses, subscribed to vacancy
    mapping(bytes32 => address[]) public candidates_on_vacancy;

    // employer address => employer vacancies list
    mapping(address => bytes32[]) vacancy_uuids;

    // candidate address => status
    mapping(address => candidate_status) public candidate_statuses;

    // candidate address => vacancies, candidate subscribed to
    mapping(address => bytes32[]) public candidate_vacancies;

    // vacancy uuid => candidate address => current pipeline action index for candidate
    mapping(bytes32 => mapping(address => uint128)) current_candidate_action_index;

    // vacancy uuid => candidate address => vacancy passed?
    mapping(bytes32 => mapping(address => bool)) public vacancy_candidate_pass;

    // vacancy uuid => candidate address => vacancy starts?
    mapping(bytes32 => mapping(address => bool)) public vacancy_candidate_starts;

    struct Fact {
        address from;
        uint256 time;
        string fact;
    }

    struct Fact_dict {
        mapping(bytes32 => Fact) dict;
        bytes32[] keys;
    }
    // candidate address => facts about candidate
    mapping(address => Fact_dict) facts;

    // events
    event NewEmployer(address employer_address);
    event NewCandidate(address candidate_address);
    event NewVacancy(address employer_address, bytes32 id);
    event NewPipelineMaxLength(address sender, uint256 count);
    event NewFact(address sender, bytes32 id);
    event CandidateRevoked(bytes32 vacancy, address candidate, address revoked_by);
    event CandidateChangeStatus(address candidate, candidate_status status);
    event Subscribed(bytes32 vacancy_uuid, address candidate);

    modifier onlyEmployer(bytes32 _uuid) {
        require(vacancies[_uuid].keeper == msg.sender || Ownable(vacancies[_uuid].keeper).owners(msg.sender));
        _;
    }

    modifier whenVacancyEnabled(bytes32 _uuid) {
        require(vacancies[_uuid].enabled);
        _;
    }

    function Oracle(string _name, uint8 _service_fee, address _beneficiary, address _token) public {
        name = _name;
        service_fee = _service_fee;
        beneficiary = _beneficiary;
        token = ERC20(_token);
        pipeline_max_length = 6;
    }

    function new_fact(address _candidate, string _fact) public onlyOwner {
        bytes32 _id = keccak256(abi.encodePacked(_fact));
        facts[_candidate].dict[_id] = Fact(msg.sender, now, _fact);
        facts[_candidate].keys.push(_id);
        emit NewFact(msg.sender, _id);
    }

    function keys_of_facts_length(address _candidate) public view returns (uint) {
        return facts[_candidate].keys.length;
    }

    function keys_of_facts(address _candidate) public view returns (bytes32[]) {
        return facts[_candidate].keys;
    }

    function fact_key_by_id(address _candidate, uint256 _index) public view returns (bytes32) {
        return facts[_candidate].keys[_index];
    }

    function get_fact(address _candidate, bytes32 _id) public view returns (address from, uint256 time, string fact) {
        return (facts[_candidate].dict[_id].from, facts[_candidate].dict[_id].time, facts[_candidate].dict[_id].fact);
    }

    function new_pipeline_max_length(uint256 _new_max) public onlyOwner {
        pipeline_max_length = _new_max;
        emit NewPipelineMaxLength(msg.sender, _new_max);
    }

    // percent awarded for test passed by candidate
    function new_service_fee(uint8 _service_fee) public onlyOwner {
        service_fee = _service_fee;
    }

    function new_beneficiary(address _beneficiary) public onlyOwner {
        beneficiary = _beneficiary;
    }

    function new_employer(address _employer) public onlyOwner {
        employers.push(_employer);
        emit NewEmployer(_employer);
    }

    function get_employers() public view returns (address[]) {
        return employers;
    }

    function new_candidate(address _candidate) public onlyOwner {
        candidates.push(_candidate);
        emit NewCandidate(_candidate);
    }

    function get_candidates() public view returns (address[]) {
        return candidates;
    }

    function change_candidate_status(address _candidate, candidate_status _status) public onlyOwner {
        candidate_statuses[_candidate] = _status;
    }

    function get_candidate_current_action_index(bytes32 _vac_uuid, address _candidate) public view returns (int256) {
        if (!vacancy_candidate_starts[_vac_uuid][_candidate]) {
            return -1;
        }
        return current_candidate_action_index[_vac_uuid][_candidate];
    }

    // 0xdd870fa1b7c4700f2bd7f44238821c26f7392148, "vac",1000
    function new_vacancy(address _employer_address, bytes32 _uuid, uint256 _allowed) public onlyOwner {
        vacancies[_uuid].allowed = _allowed;
        vacancies[_uuid].keeper = _employer_address;
        vacancy_uuids[_employer_address].push(_uuid);
        emit NewVacancy(_employer_address, _uuid);
    }

    function new_vacancy_pipeline_action(bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public onlyEmployer(_vac_uuid) {
        uint256 new_index = get_vacancy_pipeline_length(_vac_uuid);
        require(new_index < pipeline_max_length);
        vacancy_pipeline[_vac_uuid].push(Action(new_index, _title, _fee, _appr));
    }

    function change_vacancy_pipeline_action(bytes32 _vac_uuid,
        uint256 _action_index,
        bytes32 _title,
        uint256 _fee,
        bool _app) public onlyEmployer(_vac_uuid) {
        require(_action_index < get_vacancy_pipeline_length(_vac_uuid));
        vacancy_pipeline[_vac_uuid][_action_index] = Action(_action_index, _title, _fee, _app);
    }

    function delete_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index) public onlyEmployer(_vac_uuid) returns (bool) {
        uint256 pipeline_length = get_vacancy_pipeline_length(_vac_uuid);
        require(_action_index < pipeline_length);
        delete vacancy_pipeline[_vac_uuid][_action_index];
        for (uint256 i = _action_index; i < pipeline_length - 1; i++) {
            vacancy_pipeline[_vac_uuid][i] = vacancy_pipeline[_vac_uuid][i + 1];
            vacancy_pipeline[_vac_uuid][i].id = vacancy_pipeline[_vac_uuid][i].id - 1;
        }
        vacancy_pipeline[_vac_uuid].length--;
    }

    function move_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _from_pos, uint256 _to_pos) public onlyEmployer(_vac_uuid) {
        if (_from_pos == _to_pos) {
            return;
        }
        uint256 pipeline_length = get_vacancy_pipeline_length(_vac_uuid);
        require(_from_pos < pipeline_length && _to_pos < pipeline_length);
        Action memory act = vacancy_pipeline[_vac_uuid][_from_pos];
        uint256 i;
        if (_from_pos > _to_pos) {
            for (i = _from_pos; i > _to_pos; i--) {
                vacancy_pipeline[_vac_uuid][i] = vacancy_pipeline[_vac_uuid][i - 1];
                vacancy_pipeline[_vac_uuid][i].id = vacancy_pipeline[_vac_uuid][i].id + 1;
            }
        } else {
            for (i = _from_pos; i < _to_pos; i++) {
                vacancy_pipeline[_vac_uuid][i] = vacancy_pipeline[_vac_uuid][i + 1];
                vacancy_pipeline[_vac_uuid][i].id = vacancy_pipeline[_vac_uuid][i].id - 1;
            }
        }
        act.id = _to_pos;
        vacancy_pipeline[_vac_uuid][_to_pos] = act;
    }

    function change_vacancy_amount(bytes32 _uuid, uint256 _allowed) public onlyEmployer(_uuid) {
        vacancies[_uuid].allowed = _allowed;
    }

    function employer_vacancies_length(address _employer_address) public view returns (uint) {
        return vacancy_uuids[_employer_address].length;
    }

    function candidate_vacancies_length(address _candidate) public view returns (uint) {
        return candidate_vacancies[_candidate].length;
    }

    function vacancy_candidates_length(bytes32 _vac_uuid) public view returns (uint) {
        return candidates_on_vacancy[_vac_uuid].length;
    }

    function employer_vacancies(address _employer_address) public view returns (bytes32[]) {
        return vacancy_uuids[_employer_address];
    }

    function employer_vacancy_by_id(address _employer_address, uint256 _index) public view returns (bytes32) {
        return vacancy_uuids[_employer_address][_index];
    }

    function get_vacancy_pipeline_length(bytes32 _uuid) public view returns (uint256) {
        return vacancy_pipeline[_uuid].length;
    }

    function disable_vac(bytes32 _uuid) public onlyEmployer(_uuid) {
        vacancies[_uuid].enabled = false;
    }

    function enable_vac(bytes32 _uuid) public onlyEmployer(_uuid) {
        vacancies[_uuid].enabled = true;
    }

    function subscribe(bytes32 _vac) public whenVacancyEnabled(_vac) {
        require(get_candidate_current_action_index(_vac, msg.sender) == - 1);
        candidate_vacancies[msg.sender].push(_vac);
        candidates_on_vacancy[_vac].push(msg.sender);
        vacancy_candidate_starts[_vac][msg.sender] = true;
        emit Subscribed(_vac, msg.sender);
    }

    function process_action(bytes32 _vac_uuid, address _candidate) private  whenVacancyEnabled(_vac_uuid) {
        require(!vacancy_candidate_pass[_vac_uuid][_candidate]);

        if (current_candidate_action_index[_vac_uuid][_candidate] >= get_vacancy_pipeline_length(_vac_uuid)) {
            vacancy_candidate_pass[_vac_uuid][_candidate] = true;
            return;
        }
        Action memory current_action = vacancy_pipeline[_vac_uuid][current_candidate_action_index[_vac_uuid][_candidate]];
        if (current_action.fee > 0) {
            require(vacancies[_vac_uuid].allowed >= current_action.fee);
            uint256 service_amount = current_action.fee.div(100).mul(service_fee);
            uint256 candidate_amount = current_action.fee.sub(service_amount);
            token.transferFrom(vacancies[_vac_uuid].keeper, beneficiary, service_amount);
            token.transferFrom(vacancies[_vac_uuid].keeper, _candidate, candidate_amount);
            vacancies[_vac_uuid].allowed = vacancies[_vac_uuid].allowed.sub(current_action.fee);
        }
        if (vacancy_pipeline[_vac_uuid].length - 1 == current_action.id) {
            vacancy_candidate_pass[_vac_uuid][_candidate] = true;
        } else {
            current_candidate_action_index[_vac_uuid][_candidate] = current_candidate_action_index[_vac_uuid][_candidate] + 1;
        }
    }

    function level_up(bytes32 _vac_uuid, address _candidate) public onlyOwner {
        require(vacancy_candidate_starts[_vac_uuid][_candidate]);
        require(!vacancy_pipeline[_vac_uuid][current_candidate_action_index[_vac_uuid][_candidate]].approvable);
        process_action(_vac_uuid, _candidate);
    }

    function approve_level_up(bytes32 _vac_uuid, address _candidate) public onlyEmployer(_vac_uuid) {
        require(vacancy_candidate_starts[_vac_uuid][_candidate]);
        process_action(_vac_uuid, _candidate);
    }

    function reset_candidate_action(bytes32 _vac, address _candidate) public onlyEmployer(_vac) {
        require(!vacancy_candidate_pass[_vac][_candidate]);
        current_candidate_action_index[_vac][_candidate] = 0;
        vacancy_candidate_starts[_vac][_candidate] = false;
        removeByValue(_vac, _candidate);
        emit CandidateRevoked(_vac, _candidate, msg.sender);
    }

    function removeByValue(bytes32 _vac_uuid, address _candidate) private {
        uint256 i = find(_vac_uuid, _candidate);
        removeByIndex(_vac_uuid, i);
    }

    function find(bytes32 _vac_uuid, address _candidate) private view returns (uint) {
        uint256 i = 0;
        while (candidates_on_vacancy[_vac_uuid][i] != _candidate) {
            i++;
        }
        return i;
    }

    function removeByIndex(bytes32 _vac_uuid, uint i) private {
        while (i < candidates_on_vacancy[_vac_uuid].length - 1) {
            candidates_on_vacancy[_vac_uuid][i] = candidates_on_vacancy[_vac_uuid][i + 1];
            i++;
        }
        candidates_on_vacancy[_vac_uuid].length--;
    }
}
