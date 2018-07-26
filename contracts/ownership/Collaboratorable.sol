pragma solidity ^0.4.21;

import './../token//Withdrawable.sol';

contract Collaboratorable is Withdrawable {
    mapping(address => bool) public collaborators;

    event NewCollaborator(address who, address added_by);
    event DeletedCollaborator(address who, address deleted_by);

    modifier onlyCollaborator() {
        require(collaborators[msg.sender] || owners[msg.sender]);
        _;
    }

    function newCollaborator(address _newCollaborator) public onlyOwner {
        if (_newCollaborator != address(0)) {
            collaborators[_newCollaborator] = true;
            emit NewCollaborator(msg.sender, _newCollaborator);
        }
    }

    function delCollaborator(address _delCollaborator) public onlyOwner {
        collaborators[_delCollaborator] = false;
        emit DeletedCollaborator(msg.sender, _delCollaborator);
    }
}
