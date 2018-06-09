pragma solidity ^0.4.21;

import './token/Withdrawable.sol';
import './Oracle.sol';

contract Candidate is Withdrawable {

    bytes32 public id;
    Oracle oracle;

    function Candidate(bytes32 _id, address _oracle) public {
        id = _id;
        oracle = Oracle(_oracle);
    }

    function subscribe(bytes32 _vac_uuid) public onlyOwner {
        oracle.subscribe(_vac_uuid);
    }
}
