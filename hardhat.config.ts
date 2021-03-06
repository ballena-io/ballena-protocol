import { existsSync, readFileSync } from 'fs'
import { BalleNetworkConfig } from './types/config'
import { HardhatUserConfig, NetworksUserConfig, HardhatNetworkUserConfig, NetworkUserConfig } from 'hardhat/types'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
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
      //chainId: 56,
      chainId: 31337,
      allowUnlimitedContractSize: false,
      accounts: [
        {
          privateKey: deployerPrivateKey,
          balance: '10000000000000000000000',
        },
        {
          privateKey: testPrivateKey,
          balance: '10000000000000000000000',
        },
        {
          privateKey: test2PrivateKey,
          balance: '10000000000000000000000',
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
        runs: 200,
      },
      metadata: {
        bytecodeHash: 'none',
      },
    },
  },
  networks: configureNetworks(balleNetworkConfig),
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    sources: 'contracts',
    deploy: 'src/deploy',
  },
  typechain: {
    outDir: 'build/typechain',
    target: 'ethers-v5',
  },
  namedAccounts: {
    deployer: 0,
    test: 1,
    test2: 2,
    balle: {
      default: '0x9f0D5f45CE8573f43E0BA17876329784be0fd700', // use mainnet address, because we use fork
      56: '0x9f0D5f45CE8573f43E0BA17876329784be0fd700', // BSC mainnet
      97: '0x8bD237e94CE369F6D78c7bb08B90efc5c6f27A4f', // BSC testnet
    },
    wbnb: {
      56: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      97: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    },
    busd: {
      56: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      97: '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee',
    },
    harvester: {
      default: '0xb25D37892305FE1b44c06F035139a0ED11EcA82d',
    },
  },
  etherscan: {
    apiKey: balleNetworkConfig.apiKey,
  },
  mocha: {
    timeout: 30000,
  },
}

export default config
