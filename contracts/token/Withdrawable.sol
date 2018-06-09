pragma solidity ^0.4.21;

import '../lifecycle/Pausable.sol';
import './ERC20.sol';


contract Withdrawable is Pausable {
    function withdraw(address _token, address _to, uint256 _amount) public onlyOwner {
        ERC20(_token).transfer(_to, _amount);
    }
}
