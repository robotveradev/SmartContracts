pragma solidity ^0.4.21;

import './ownership/Ownable.sol';
import './math/SafeMath.sol';

contract Facts is Ownable {
    using SafeMath for uint256;
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

    // member facts number_of_confirmations (sender, member, fact_id, is verify )
    mapping(address => mapping(address => mapping(bytes32 => bool))) public member_fact_confirmations;
    // member => fact uuid => number of confirmations
    mapping(address => mapping(bytes32 => uint256)) public facts_confirmations_count;

    event NewFact(address sender, bytes32 id);
    event FactConfirmationAdded(address sender, address member, bytes32 id);
    event FactVerified(address member, bytes32 id);

    function new_fact(address _member, string _fact, bytes32 _fact_uuid, address _sender) public onlyOwner {
        facts[_member].dict[_fact_uuid] = Fact(_sender, now, _fact);
        facts[_member].keys.push(_fact_uuid);
        emit NewFact(_sender, _fact_uuid);
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

    function verify_fact(address _member, bytes32 _id, address _verifier) public onlyOwner {
        // member not verify facts yet
        require(!member_fact_confirmations[_verifier][_member][_id]);
        // member cannot verify his own fact
        require(_member != _verifier);
        member_fact_confirmations[_verifier][_member][_id] = true;
        facts_confirmations_count[_member][_id] = facts_confirmations_count[_member][_id].add(1);
        emit FactConfirmationAdded(_verifier, _member, _id);
    }
}
