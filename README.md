# ballena-protocol

[![codecov](https://codecov.io/gh/ballena-io/ballena-protocol/branch/master/graph/badge.svg?token=zmQsGQ5KVQ)](https://codecov.io/gh/ballena-io/ballena-protocol)

Implementation of [ballena.io](https://ballena.io) smart contracts on the Binance Smart Chain. In-depth documentation on [ballena.io](https://ballena.io) is available at [docs.ballena.io](https://docs.ballena.io).

## Implementation docs

In the [docs](./docs/) folder you will find all documentation related to the implementation of the smart contracts.

## Developers

Our contracts are written in Solidity and our tests and scripts in TypeScript.

If you want to contribute, familiarity with [Hardhat](https://github.com/nomiclabs/hardhat), [Ethers](https://github.com/ethers-io/ethers.js),
[Waffle](https://github.com/EthWorks/Waffle) and [TypeChain](https://github.com/ethereum-ts/TypeChain) is needed.

### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Format Code

Run the Prettier formatter:

```sh
$ yarn prettier
```

### Tests

Run the tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Clean

Delete the smart contract artifacts, the Hardhat cache, TypeChain types and the coverage reports:

```sh
$ yarn clean
```

## Discussion

For any concerns or feedback, open an issue or visit us on [Discord](https://discord.gg/fWwyskse2Z) to discuss.

## License

Everything is released under the [MIT license](./LICENSE).
