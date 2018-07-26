pragma solidity ^0.4.21;

import './ownership/Ownable.sol';
import './math/SafeMath.sol';
import './token/ERC20.sol';

contract Oracle is Ownable {
    using SafeMath for uint256;

    string public name;
    address public beneficiary;
    ERC20 public token;

    enum member_status {open_to_suggestions, in_search_of_work, not_accepting_offers}

    address[] members;

    address[] companies;

    uint8 public service_fee;

    uint256 public pipeline_max_length;

    uint8 public number_of_confirmations;

    struct Action {
        uint256 id;
        bytes32 title;
        uint256 fee;
        bool approvable;
    }

    struct Vacancy {
        bool enabled;
        uint allowed;
    }

    //company => members
    mapping(address => address[]) company_members;

    //member => companies
    mapping(address => address[]) member_companies;

    // company address => vacancy uuid => vacancy
    mapping(address => mapping(bytes32 => Vacancy)) public vacancies;

    // company address => vacancy uuid => vacancy pipeline
    mapping(address => mapping(bytes32 => Action[])) public vacancy_pipeline;

    // company address => vacancy uuid => candidate addresses, subscribed to vacancy
    mapping(address => mapping(bytes32 => address[])) public members_on_vacancy;

    // company address => company vacancies list
    mapping(address => bytes32[]) vacancy_uuids;

    // member address => status
    mapping(address => member_status) public members_statuses;

    // member address => vacancies, member subscribed to
    mapping(address => bytes32[]) public member_vacancies;

    // company address => vacancy uuid => member address => current pipeline action index for member
    mapping(address => mapping(bytes32 => mapping(address => uint128))) member_current_action_index;

    // company address => vacancy uuid => member address => vacancy passed?
    mapping(address => mapping(bytes32 => mapping(address => bool))) public member_vacancy_pass;

    // company address => vacancy uuid => member address => vacancy starts?
    mapping(address => mapping(bytes32 => mapping(address => bool))) public member_vacancy_starts;

    struct Fact {
        address from;
        uint256 time;
        string fact;
    }

    struct Fact_dict {
        mapping(bytes32 => Fact) dict;
        bytes32[] keys;
    }

    // member address => facts about member
    mapping(address => Fact_dict) facts;

    // member facts number_of_confirmations (sender, member, fact_id, is verify)
    mapping(address => mapping(address => mapping(bytes32 => bool))) member_fact_confirmations;
    // member => fact uuid => number of confirmations
    mapping(address => mapping(bytes32 => uint256)) facts_confirmations_count;

    // events
    event NewMember(address member);
    event NewCompany(address company);
    event NewVacancy(address company, bytes32 id);
    event NewAction(address company, bytes32 vacancy_uuid);

    event NewPipelineMaxLength(address sender, uint256 count);
    event NewServiceFee(address sender, uint8 fee);
    event NewBeneficiary(address sender, address beneficiary);

    event NewFact(address sender, bytes32 id);
    event FactConfirmationAdded(address sender, address member, bytes32 fact_id);
    event FactVerified(address member, bytes32 fact_id);

    event MemberRevoked(address company, bytes32 vac_uuid, address member);
    event MemberLevelUp(address company, bytes32 vac_uuid, address member, uint256 to);
    event MemberPassPipeline(address company, bytes32 vac_uuid, address member);

    event MemberStatusChanged(address member, member_status status);
    event Subscribed(address company, bytes32 vacancy_uuid, address member);

    modifier whenVacancyEnabled(address _company, bytes32 _uuid) {
        require(vacancies[_company][_uuid].enabled);
        _;
    }

    //"Vera", 1, "0xca35b7d915458ef540ade6068dfe2f44e8fa733c","0xca35b7d915458ef540ade6068dfe2f44e8fa733c"
    function Oracle(string _name, uint8 _service_fee, address _beneficiary, address _token) public {
        name = _name;
        service_fee = _service_fee;
        beneficiary = _beneficiary;
        token = ERC20(_token);
        pipeline_max_length = 6;
    }

    function new_fact(address _member, string _fact) public {
        bytes32 _id = keccak256(abi.encodePacked(_fact));
        facts[_member].dict[_id] = Fact(msg.sender, now, _fact);
        facts[_member].keys.push(_id);
        emit NewFact(msg.sender, _id);
    }

    function keys_of_facts_length(address _member) public view returns (uint) {
        return facts[_member].keys.length;
    }

    function keys_of_facts(address _member) public view returns (bytes32[]) {
        return facts[_member].keys;
    }

    function fact_key_by_id(address _member, uint256 _index) public view returns (bytes32) {
        return facts[_member].keys[_index];
    }

    function get_fact(address _member, bytes32 _id) public view returns (address from, uint256 time, string fact) {
        return (facts[_member].dict[_id].from,
        facts[_member].dict[_id].time,
        facts[_member].dict[_id].fact);
    }

    function verify_fact(address _member, bytes32 _id) public {
        // member not verify factsct yet
        require(!member_fact_confirmations[msg.sender][_member][_id]);
        // member cannot verify his own fact
        require(facts[_member].dict[_id].from != msg.sender);
        facts_confirmations_count[_member][_id].add(1);
        emit FactConfirmationAdded(msg.sender, _member, _id);
    }

    function new_pipeline_max_length(uint256 _new_max) public onlyOwner {
        pipeline_max_length = _new_max;
        emit NewPipelineMaxLength(msg.sender, _new_max);
    }

    // percent awarded for test/interview passed by member
    function new_service_fee(uint8 _service_fee) public onlyOwner {
        service_fee = _service_fee;
        emit NewServiceFee(msg.sender, _service_fee);
    }

    function new_beneficiary(address _beneficiary) public onlyOwner {
        beneficiary = _beneficiary;
        emit NewBeneficiary(msg.sender, _beneficiary);
    }

    function new_company() public {
        companies.push(msg.sender);
        emit NewCompany(msg.sender);
    }

    function get_companies() public view returns (address[]) {
        return companies;
    }

    function new_member() public {
        members.push(msg.sender);
        emit NewMember(msg.sender);
    }

    function get_members() public view returns (address[]) {
        return members;
    }

    // called from company address
    function new_company_member(address _member) public {
        company_members[msg.sender].push(_member);
        member_companies[_member].push(msg.sender);
    }

    function member_companies_length(address _member) public view returns (uint256 length) {
        length = member_companies[_member].length;
    }

    function member_company_by_index(address _member, uint256 _index) public view returns (address company) {
        company = member_companies[_member][_index];
    }

    function get_member_companies(address _member) public view returns (address[]) {
        return member_companies[_member];
    }

    function company_members_length(address _company) public view returns (uint256 length) {
        length = company_members[_company].length;
    }

    function company_member_by_index(address _company, uint256 _index) public view returns (address member) {
        member = company_members[_company][_index];
    }

    function get_company_members(address _company) public view returns (address[]) {
        return company_members[_company];
    }

    function change_member_status(member_status _status) public {
        members_statuses[msg.sender] = _status;
        emit MemberStatusChanged(msg.sender, _status);
    }

    function get_member_current_action_index(address _company_address, bytes32 _vac_uuid, address _member) public view returns (int256) {
        if (!member_vacancy_starts[_company_address][_vac_uuid][_member]) {
            return - 1;
        }
        return member_current_action_index[_company_address][_vac_uuid][_member];
    }

    // 0xdd870fa1b7c4700f2bd7f44238821c26f7392148, "vac",1000
    // must be called from company address
    function new_vacancy(bytes32 _uuid, uint256 _allowed) public {
        vacancies[msg.sender][_uuid].allowed = _allowed;
        vacancy_uuids[msg.sender].push(_uuid);
        emit NewVacancy(msg.sender, _uuid);
    }

    // must be called from company address
    function new_vacancy_pipeline_action(bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public {
        uint256 new_index = get_vacancy_pipeline_length(msg.sender, _vac_uuid);
        require(new_index < pipeline_max_length);
        vacancy_pipeline[msg.sender][_vac_uuid].push(Action(new_index, _title, _fee, _appr));
        emit NewAction(msg.sender, _vac_uuid);
    }

    // must be called from company address
    function change_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index,
        bytes32 _title, uint256 _fee, bool _app) public {
        require(_action_index < get_vacancy_pipeline_length(msg.sender, _vac_uuid));
        vacancy_pipeline[msg.sender][_vac_uuid][_action_index] = Action(_action_index, _title, _fee, _app);
    }

    // must be called from company address
    function delete_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index) public returns (bool) {
        uint256 pipeline_length = get_vacancy_pipeline_length(msg.sender, _vac_uuid);
        require(_action_index < pipeline_length);
        delete vacancy_pipeline[msg.sender][_vac_uuid][_action_index];
        for (uint256 i = _action_index; i < pipeline_length - 1; i++) {
            vacancy_pipeline[msg.sender][_vac_uuid][i] = vacancy_pipeline[msg.sender][_vac_uuid][i + 1];
            vacancy_pipeline[msg.sender][_vac_uuid][i].id = vacancy_pipeline[msg.sender][_vac_uuid][i].id - 1;
        }
        vacancy_pipeline[msg.sender][_vac_uuid].length--;
    }
    // must be called from company address
    function move_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _from_pos, uint256 _to_pos) public {
        if (_from_pos == _to_pos) {
            return;
        }
        uint256 pipeline_length = get_vacancy_pipeline_length(msg.sender, _vac_uuid);
        require(_from_pos < pipeline_length && _to_pos < pipeline_length);
        Action memory act = vacancy_pipeline[msg.sender][_vac_uuid][_from_pos];
        uint256 i;
        if (_from_pos > _to_pos) {
            for (i = _from_pos; i > _to_pos; i--) {
                vacancy_pipeline[msg.sender][_vac_uuid][i] = vacancy_pipeline[msg.sender][_vac_uuid][i - 1];
                vacancy_pipeline[msg.sender][_vac_uuid][i].id = vacancy_pipeline[msg.sender][_vac_uuid][i].id + 1;
            }
        } else {
            for (i = _from_pos; i < _to_pos; i++) {
                vacancy_pipeline[msg.sender][_vac_uuid][i] = vacancy_pipeline[msg.sender][_vac_uuid][i + 1];
                vacancy_pipeline[msg.sender][_vac_uuid][i].id = vacancy_pipeline[msg.sender][_vac_uuid][i].id - 1;
            }
        }
        act.id = _to_pos;
        vacancy_pipeline[msg.sender][_vac_uuid][_to_pos] = act;
    }
    // must be called from company address
    function change_vacancy_amount(bytes32 _uuid, uint256 _allowed) public {
        vacancies[msg.sender][_uuid].allowed = _allowed;
    }

    function company_vacancies_length(address _company_address) public view returns (uint) {
        return vacancy_uuids[_company_address].length;
    }

    function member_vacancies_length(address _member) public view returns (uint) {
        return member_vacancies[_member].length;
    }

    function vacancy_members_length(address _company, bytes32 _vac_uuid) public view returns (uint) {
        return members_on_vacancy[_company][_vac_uuid].length;
    }

    function company_vacancies(address _company_address) public view returns (bytes32[]) {
        return vacancy_uuids[_company_address];
    }

    function company_vacancy_uuid_by_id(address _company_address, uint256 _index) public view returns (bytes32) {
        return vacancy_uuids[_company_address][_index];
    }

    function get_vacancy_pipeline_length(address _company, bytes32 _uuid) public view returns (uint256) {
        return vacancy_pipeline[_company][_uuid].length;
    }

    // must be called from company address
    function disable_vac(bytes32 _uuid) public {
        vacancies[msg.sender][_uuid].enabled = false;
    }

    // must be called from company address
    function enable_vac(bytes32 _uuid) public {
        vacancies[msg.sender][_uuid].enabled = true;
    }
    // must call from member address
    function subscribe(address _company, bytes32 _vac_uuid) public whenVacancyEnabled(_company, _vac_uuid) {
        require(get_member_current_action_index(_company, _vac_uuid, msg.sender) == - 1);
        member_vacancies[msg.sender].push(_vac_uuid);
        members_on_vacancy[_company][_vac_uuid].push(msg.sender);
        member_vacancy_starts[_company][_vac_uuid][msg.sender] = true;
        emit Subscribed(_company, _vac_uuid, msg.sender);
    }

    function process_action(address _company, bytes32 _vac_uuid, address _member) private whenVacancyEnabled(_company, _vac_uuid) {
        require(!member_vacancy_pass[_company][_vac_uuid][_member]);

        if (member_current_action_index[_company][_vac_uuid][_member] >= get_vacancy_pipeline_length(_company, _vac_uuid)) {
            member_vacancy_pass[_company][_vac_uuid][_member] = true;
            emit MemberPassPipeline(_company, _vac_uuid, _member);
            return;
        }
        Action memory current_action = vacancy_pipeline[_company][_vac_uuid][member_current_action_index[_company][_vac_uuid][_member]];
        if (current_action.fee > 0) {
            require(vacancies[_company][_vac_uuid].allowed >= current_action.fee);
            uint256 service_amount = current_action.fee.div(100).mul(service_fee);
            uint256 member_reward_amount = current_action.fee.sub(service_amount);
            token.transferFrom(_company, beneficiary, service_amount);
            token.transferFrom(_company, _member, member_reward_amount);
            vacancies[_company][_vac_uuid].allowed = vacancies[_company][_vac_uuid].allowed.sub(current_action.fee);
        }
        if (vacancy_pipeline[_company][_vac_uuid].length - 1 == current_action.id) {
            member_vacancy_pass[_company][_vac_uuid][_member] = true;
            emit MemberPassPipeline(_company, _vac_uuid, _member);
        } else {
            uint128 cur_id = member_current_action_index[_company][_vac_uuid][_member];
            member_current_action_index[_company][_vac_uuid][_member] = cur_id + 1;
            emit MemberLevelUp(_company, _vac_uuid, _member, cur_id + 1);
        }
    }

    function level_up(address _company, bytes32 _vac_uuid, address _member) public onlyOwner {
        require(member_vacancy_starts[_company][_vac_uuid][_member]);
        require(!vacancy_pipeline[_company][_vac_uuid][member_current_action_index[_company][_vac_uuid][_member]].approvable);
        process_action(_company, _vac_uuid, _member);
    }

    // called from company address
    function approve_level_up(bytes32 _vac_uuid, address _member) public {
        require(member_vacancy_starts[msg.sender][_vac_uuid][_member]);
        process_action(msg.sender, _vac_uuid, _member);
    }

    // called from company address
    function reset_member_action(bytes32 _vac_uuid, address _member) public {
        require(!member_vacancy_pass[msg.sender][_vac_uuid][_member]);
        member_current_action_index[msg.sender][_vac_uuid][_member] = 0;
        member_vacancy_starts[msg.sender][_vac_uuid][_member] = false;
        removeByValue(msg.sender, _vac_uuid, _member);
        emit MemberRevoked(msg.sender, _vac_uuid, _member);
    }

    function removeByValue(address _company, bytes32 _vac_uuid, address _member) private {
        uint256 i = find(_company, _vac_uuid, _member);
        removeByIndex(_company, _vac_uuid, i);
    }

    function find(address _company, bytes32 _vac_uuid, address _member) private view returns (uint) {
        uint256 i = 0;
        while (members_on_vacancy[_company][_vac_uuid][i] != _member) {
            i++;
        }
        return i;
    }

    function removeByIndex(address _company, bytes32 _vac_uuid, uint i) private {
        while (i < members_on_vacancy[_company][_vac_uuid].length - 1) {
            members_on_vacancy[_company][_vac_uuid][i] = members_on_vacancy[_company][_vac_uuid][i + 1];
            i++;
        }
        members_on_vacancy[_company][_vac_uuid].length--;
    }
}
