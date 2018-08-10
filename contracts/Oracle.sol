pragma solidity ^0.4.21;

import './ownership/Ownable.sol';
import './math/SafeMath.sol';
import './token/ERC20.sol';
import './Member.sol';
import './Facts.sol';
import './Pipeline.sol';


contract Oracle is Ownable {
    using SafeMath for uint256;

    string public name;
    address public beneficiary;
    ERC20 public token;
    Facts facts;
    Pipeline pipeline;

    enum member_status {open_to_suggestions, in_search_of_work, not_accepting_offers}

    address[] members;

    address[] companies;

    uint8 public service_fee;

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

    // company address => vacancy uuid => candidate addresses, subscribed to vacancy
    mapping(address => mapping(bytes32 => address[])) public members_on_vacancy;

    // company address => company vacancies list
    mapping(address => bytes32[]) vacancy_uuids;

    // member address => status
    mapping(address => member_status) public members_statuses;

    // member address => FactVerified
    mapping(address => bool) public member_verified;

    // member address => vacancies, member subscribed to
    mapping(address => bytes32[]) public member_vacancies;

    // company address => vacancy uuid => member address => current pipeline action index for member
    mapping(address => mapping(bytes32 => mapping(address => uint128))) member_current_action_index;

    // company address => vacancy uuid => member address => vacancy passed?
    mapping(address => mapping(bytes32 => mapping(address => bool))) public member_vacancy_pass;

    // company address => vacancy uuid => member address => vacancy starts?
    mapping(address => mapping(bytes32 => mapping(address => bool))) public member_vacancy_starts;

    // events
    event NewMember(address member);
    event NewCompany(address company);
    event NewVacancy(address company, bytes32 uuid);

    event NewServiceFee(address sender, uint8 fee);
    event NewBeneficiary(address sender, address beneficiary);

    event MemberRevoked(address company, bytes32 uuid, address member);
    event MemberLevelUp(address company, bytes32 uuid, address member, uint256 to);
    event MemberPassPipeline(address company, bytes32 uuid, address member);

    event MemberStatusChanged(address member, member_status status);
    event Subscribed(address company, bytes32 uuid, address member);

    modifier whenVacancyEnabled(address _company, bytes32 _uuid) {
        require(vacancies[_company][_uuid].enabled);
        _;
    }

    modifier onlyVerified() {
        require(member_verified[msg.sender]);
        _;
    }

    //"Vera", 1, "0xca35b7d915458ef540ade6068dfe2f44e8fa733c","0xca35b7d915458ef540ade6068dfe2f44e8fa733c", "0x83be1f6e44a79014e1776835ce46acd00f035843"
    function Oracle(string _name, uint8 _service_fee, address _beneficiary, address _token, address _facts, address _pipeline) public {
        name = _name;
        service_fee = _service_fee;
        beneficiary = _beneficiary;
        token = ERC20(_token);
        facts = Facts(_facts);
        pipeline = Pipeline(_pipeline);
    }

    // must be called from company address
    function new_vacancy_pipeline_action(bytes32 _vac_uuid, bytes32 _title, uint256 _fee, bool _appr) public {
        pipeline.new_vacancy_pipeline_action(msg.sender, _vac_uuid, _title, _fee, _appr);
    }

     // must be called from company address
    function change_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index,
        bytes32 _title, uint256 _fee, bool _appr) public {
        pipeline.change_vacancy_pipeline_action(msg.sender, _vac_uuid, _action_index, _title, _fee, _appr);
    }

    // must be called from company address
    function delete_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _action_index) public {
        pipeline.delete_vacancy_pipeline_action(msg.sender, _vac_uuid, _action_index);
    }

    // must be called from company address
    function move_vacancy_pipeline_action(bytes32 _vac_uuid, uint256 _from_pos, uint256 _to_pos) public {
        pipeline.move_vacancy_pipeline_action(msg.sender, _vac_uuid, _from_pos, _to_pos);
    }

    function new_pipeline_max_length(uint256 _new_max) public onlyOwner {
        pipeline.new_pipeline_max_length(_new_max);
    }

    function pipeline_max_length() public view returns (uint256) {
        return pipeline.pipeline_max_length();
    }

    function get_vacancy_pipeline_length(address _company, bytes32 _vac_uuid) public view returns (uint256) {
        return pipeline.get_vacancy_pipeline_length(_company, _vac_uuid);
    }

    function vacancy_pipeline(address _company, bytes32 _vac_uuid, uint256 _index) public view returns (uint256, bytes32, uint256, bool) {
        return pipeline.vacancy_pipeline(_company, _vac_uuid, _index);
    }

    function member_fact_confirmations(address _verifier, address _member, bytes32 _fact_uuid) public view returns (bool) {
        return facts.member_fact_confirmations(_verifier, _member, _fact_uuid);
    }

    function verify_fact(address _member, bytes32 _id) public onlyVerified {
        facts.verify_fact(_member, _id, msg.sender);
    }

    function facts_confirmations_count(address _member, bytes32 _id) public view returns (uint256) {
        return facts.facts_confirmations_count(_member, _id);
    }

    function new_fact(address _member, string _fact, bytes32 _fact_uuid) public {
        facts.new_fact(_member, _fact, _fact_uuid, msg.sender);
    }

    function keys_of_facts_length(address _member) public view returns (uint256) {
        return facts.keys_of_facts_length(_member);
    }

    function keys_of_facts(address _member) public view returns (bytes32[]) {
        return facts.keys_of_facts(_member);
    }

    function fact_key_by_id(address _member, uint256 _index) public view returns (bytes32) {
        return facts.fact_key_by_id(_member, _index);
    }

    function get_fact(address _member, bytes32 _id) public view returns (address from, uint256 time, string fact) {
        return facts.get_fact(_member, _id);
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

    function verify_member(address _member) public onlyOwner {
        member_verified[_member] = true;
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

    function get_member_current_action_index(address _company_address,bytes32 _vac_uuid, address _member) public view returns (int256) {
        if (!member_vacancy_starts[_company_address][_vac_uuid][_member]) {
            return -1;
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
        require(get_member_current_action_index(_company, _vac_uuid, msg.sender) == -1);
        member_vacancies[msg.sender].push(_vac_uuid);
        members_on_vacancy[_company][_vac_uuid].push(msg.sender);
        member_vacancy_starts[_company][_vac_uuid][msg.sender] = true;
        emit Subscribed(_company, _vac_uuid, msg.sender);
    }

    function process_action(address _company, bytes32 _vac_uuid, address _member) private whenVacancyEnabled(_company, _vac_uuid) {
        require(!member_vacancy_pass[_company][_vac_uuid][_member]);

        if (member_current_action_index[_company][_vac_uuid][_member] >= pipeline.get_vacancy_pipeline_length(_company, _vac_uuid)) {
            member_vacancy_pass[_company][_vac_uuid][_member] = true;
            emit MemberPassPipeline(_company, _vac_uuid, _member);
            return;
        }

        uint256 action_id = pipeline.get_action_id(_company, _vac_uuid, member_current_action_index[_company][_vac_uuid][_member]);
        uint256 action_fee = pipeline.get_action_fee(_company, _vac_uuid, member_current_action_index[_company][_vac_uuid][_member]);
        if (action_fee > 0) {
            require(vacancies[_company][_vac_uuid].allowed >= action_fee);
            uint256 service_amount = action_fee.div(100).mul(service_fee);
            uint256 member_reward_amount = action_fee.sub(service_amount);
            token.transferFrom(_company, beneficiary, service_amount);
            token.transferFrom(_company, _member, member_reward_amount);
            vacancies[_company][_vac_uuid].allowed = vacancies[_company][_vac_uuid].allowed.sub(action_fee);
        }
        if (pipeline.get_vacancy_pipeline_length(_company, _vac_uuid) - 1 == action_id) {
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
        bool action_appr = pipeline.get_action_approvable(_company, _vac_uuid, member_current_action_index[_company][_vac_uuid][_member]);
        require(!action_appr);
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
