[![OnGrid Systems Blockchain Applications DApps Development](img/ongrid-systems-cover.png)](https://ongrid.pro/)

[![Build Status](https://travis-ci.org/robotveradev/SmartContracts.svg?branch=master)](https://travis-ci.org/robotveradev/SmartContracts)
[![Coverage Status](https://coveralls.io/repos/github/robotveradev/SmartContracts/badge.svg?branch=master)](https://coveralls.io/github/robotveradev/SmartContracts?branch=master)
[![Project website](https://img.shields.io/website-up-down-green-red/http/vera.jobs.svg?label=project-website)](https://vera.jobs)
[![Demo website](https://img.shields.io/website-up-down-green-red/http/vera.wtf.svg?label=demo-website)](https://vera.wtf)
![GitHub](https://img.shields.io/github/license/robotveradev/SmartContracts.svg)

## VERA Platform smart contracts
> Ethereum SmartContracts for Vera Decentralised Recruitment Platform 
> and its crowdsale

VERA platform Ethereum contracts stack consists of
* **Oracle** - the central point for Decentralised Recruitment Platform logic;
* **Pipeline** contains actions to be passed by Candidate
* **Facts** registry storing 3rd parties claims
* **Company** contract of the hiring company

VERA contracts for TokenSale
* **PriceOracle** - contract keeping the current ETH price in USD cents to use by crowdsale contract
* **VeraCrowdsale** - contract keeping the list of investors who has passed KYC. It receives ethers to fallback,
calculates correspinding amount of tokens, add bonus (depending on the deposit size) then transfers tokens to the investor's account


## Getting started
### Get the source code
Clone the contracts repository with submodules (we use zeppelin-solidity libraries)
```
git clone --recurse-submodules git@github.com:robotveradev/SmartContracts.git
```

### Run tests
- Run ```npm install```.
- Run ```./scripts/test.sh```.

## License

Copyright (c) 2018 ROBOTVERA OÜ,
> Narva mnt 36 Kesklinna linnaosa,
> Tallinn Harju maakond 10152

Each file included in this repository is licensed under the [MIT license](LICENSE.txt).

## Contributors
* OnGrid Systems: [Site](https://ongrid.pro), [GitHub](https://github.com/OnGridSystems/), [FaceBook](https://www.facebook.com/ongrid.pro/), [Youtube](https://www.youtube.com/channel/UCT8s-f1FInO6ivn_dp-W34g), [LinkedIn](https://www.linkedin.com/company/ongridpro/)
* [Kirill Varlamov](https://github.com/ongrid)
* [Sergey Korotko](https://github.com/achievement008)
