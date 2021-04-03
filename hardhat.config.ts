import { existsSync, readFileSync } from 'fs'
import { BalleNetworkConfig } from './types/config'
import { HardhatUserConfig, NetworksUserConfig, HardhatNetworkUserConfig, NetworkUserConfig } from 'hardhat/types'
// import "hardhat-deploy"
// import "hardhat-deploy-ethers"
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'solidity-coverage'

function createHardhatNetworkConfig(
  fork: boolean,
  deployerPrivateKey?: string,
  testPrivateKey?: string,
  test2PrivateKey?: string,
): HardhatNetworkUserConfig {
  if (fork && deployerPrivateKey && testPrivateKey && test2PrivateKey) {
    return {
      forking: {
        url: 'https://bsc-dataseed.binance.org/',
      },
      allowUnlimitedContractSize: false,
      accounts: [
        {
          privateKey: deployerPrivateKey,
          balance: '10000000000000000000',
        },
        {
          privateKey: testPrivateKey,
          balance: '10000000000000000000',
        },
        {
          privateKey: test2PrivateKey,
          balance: '10000000000000000000',
        },
      ],
    }
  }
  return {
    allowUnlimitedContractSize: false,
  }
}

function createBscTestnetConfig(
  deployerPrivateKey: string,
  testPrivateKey: string,
  test2PrivateKey: string,
): NetworkUserConfig {
  return {
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    gasPrice: 20000000000,
    accounts: [deployerPrivateKey, testPrivateKey, test2PrivateKey],
  }
}

function createBscMainnetConfig(deployerPrivateKey: string): NetworkUserConfig {
  return {
    url: 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    gasPrice: 20000000000,
    accounts: [deployerPrivateKey],
  }
}

function configureNetworks(networkConfig: BalleNetworkConfig): NetworksUserConfig {
  if (
    networkConfig.deployerPrivateKey !== undefined &&
    networkConfig.testPrivateKey !== undefined &&
    networkConfig.test2PrivateKey !== undefined &&
    networkConfig.hardhatFork !== undefined
  ) {
    return {
      hardhat: createHardhatNetworkConfig(
        networkConfig.hardhatFork,
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      bsc_testnet: createBscTestnetConfig(
        networkConfig.deployerPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      bsc_mainnet: createBscMainnetConfig(networkConfig.deployerPrivateKey),
    }
  } else {
    return {
      hardhat: createHardhatNetworkConfig(false),
    }
  }
}

let balleNetworkConfig: BalleNetworkConfig
if (existsSync('./.env.local.json')) {
  balleNetworkConfig = JSON.parse(readFileSync('./.env.local.json').toString())
} else {
  balleNetworkConfig = JSON.parse(readFileSync('./.env.json').toString())
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
      metadata: {
        bytecodeHash: 'none',
      },
    },
  },
  networks: configureNetworks(balleNetworkConfig),
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  etherscan: {
    apiKey: balleNetworkConfig.apiKey,
  },
}

export default config
