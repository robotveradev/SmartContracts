pragma solidity ^0.4.21;

contract Ownable {
    mapping(address => bool) public owners;

    function Ownable() public {
        owners[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(owners[msg.sender]);
        _;
    }

    function newOwner(address _newOwner) public onlyOwner {
        require(_newOwner != address(0));
        owners[_newOwner] = true;
    }

    function delOwner(address _owner) public onlyOwner {
        owners[_owner] = false;
    }
}
