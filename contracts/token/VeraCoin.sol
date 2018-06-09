pragma solidity ^0.4.18;

import './StandardToken.sol';

/**
 * @title VeraCoin
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract VeraCoin is StandardToken {

    string public name = "VeraCoin";

    string public symbol = "Vera";

    uint256 public decimals = 18;

    uint256 public INITIAL_SUPPLY = 15700000 * 1 ether;

    /**
    * @dev Contructor that gives msg.sender all of existing tokens.
    */
    function VeraCoin() {
        totalSupply = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
}
