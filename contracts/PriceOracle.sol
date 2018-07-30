pragma solidity ^0.4.24;

import "./rbac/RBAC.sol";
import "./math/SafeMath.sol";


/**
 * @title Ethereum price feed
 * @dev Keeps the current ETH price in USD cents to use by crowdsale contracts.
 * Price kept up to date by external script polling exchanges tickers
 * @author OnGrid Systems
 */
contract PriceOracle is RBAC {
  using SafeMath for uint256;

  // Average ETH price in USD cents
  uint256 public ethPriceInCents;

  // The change limit in percent.
  // Provides basic protection from erroneous input.
  uint256 public allowedOracleChangePercent;

  // Roles in the oracle
  string public constant ROLE_ADMIN = "admin";
  string public constant ROLE_ORACLE = "oracle";

  /**
   * @dev modifier to scope access to admins
   * // reverts if called not by admin
   */
  modifier onlyAdmin()
  {
    checkRole(msg.sender, ROLE_ADMIN);
    _;
  }

  /**
   * @dev modifier to scope access to price keeping oracles (scripts polling exchanges)
   * // reverts if called not by oracle
   */
  modifier onlyOracle()
  {
    checkRole(msg.sender, ROLE_ORACLE);
    _;
  }

  /**
   * @dev Initializes oracle contract
   * @param _initialEthPriceInCents Initial Ethereum price in USD cents
   * @param _allowedOracleChangePercent Percent of change allowed per single request
   */
  constructor(
    uint256 _initialEthPriceInCents,
    uint256 _allowedOracleChangePercent
  ) public {
    ethPriceInCents = _initialEthPriceInCents;
    allowedOracleChangePercent = _allowedOracleChangePercent;
    addRole(msg.sender, ROLE_ADMIN);
  }

  /**
   * @dev Converts ETH (wei) to USD cents
   * @param _wei amount of wei (10e-18 ETH)
   * @return cents amount
   */
  function getUsdCentsFromWei(uint256 _wei) public view returns (uint256) {
    return _wei.mul(ethPriceInCents).div(1 ether);
  }

  /**
   * @dev Converts USD cents to wei
   * @param _usdCents amount
   * @return wei amount
   */
  function getWeiFromUsdCents(uint256 _usdCents)
    public view returns (uint256)
  {
    return _usdCents.mul(1 ether).div(ethPriceInCents);
  }

  /**
   * @dev Sets current ETH price in cents
   * @param _cents USD cents
   */
  function setEthPrice(uint256 _cents)
    public
    onlyOracle
  {
    uint256 maxCents = allowedOracleChangePercent.add(100)
    .mul(ethPriceInCents).div(100);
    uint256 minCents = SafeMath.sub(100,allowedOracleChangePercent)
    .mul(ethPriceInCents).div(100);
    require(
      _cents <= maxCents && _cents >= minCents,
      "Price out of allowed range"
    );
    ethPriceInCents = _cents;
  }

  /**
   * @dev Add admin role to an address
   * @param addr address
   */
  function addAdmin(address addr)
    public
    onlyAdmin
  {
    addRole(addr, ROLE_ADMIN);
  }

  /**
   * @dev Revoke admin privileges from an address
   * @param addr address
   */
  function delAdmin(address addr)
    public
    onlyAdmin
  {
    removeRole(addr, ROLE_ADMIN);
  }

  /**
   * @dev Add oracle role to an address
   * @param addr address
   */
  function addOracle(address addr)
    public
    onlyAdmin
  {
    addRole(addr, ROLE_ORACLE);
  }

  /**
   * @dev Revoke oracle role from an address
   * @param addr address
   */
  function delOracle(address addr)
    public
    onlyAdmin
  {
    removeRole(addr, ROLE_ORACLE);
  }
}
