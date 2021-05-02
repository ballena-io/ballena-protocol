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
  harvestPrivateKey?: string,
  testPrivateKey?: string,
  test2PrivateKey?: string,
): HardhatNetworkUserConfig {
  if (fork && deployerPrivateKey && harvestPrivateKey && testPrivateKey && test2PrivateKey) {
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
          balance: '1000000000000000000000',
        },
        {
          privateKey: harvestPrivateKey,
          balance: '1000000000000000000000',
        },
        {
          privateKey: testPrivateKey,
          balance: '1000000000000000000000',
        },
        {
          privateKey: test2PrivateKey,
          balance: '1000000000000000000000',
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
  harvestPrivateKey: string,
  testPrivateKey: string,
  test2PrivateKey: string,
): NetworkUserConfig {
  return {
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    gasPrice: 20000000000,
    accounts: [deployerPrivateKey, harvestPrivateKey, testPrivateKey, test2PrivateKey],
  }
}

function createBscMainnetConfig(deployerPrivateKey: string, harvestPrivateKey: string): NetworkUserConfig {
  return {
    url: 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    gasPrice: 20000000000,
    accounts: [deployerPrivateKey, harvestPrivateKey],
  }
}

function configureNetworks(networkConfig: BalleNetworkConfig): NetworksUserConfig {
  if (
    networkConfig.deployerPrivateKey !== undefined &&
    networkConfig.harvestPrivateKey !== undefined &&
    networkConfig.testPrivateKey !== undefined &&
    networkConfig.test2PrivateKey !== undefined &&
    networkConfig.hardhatFork !== undefined
  ) {
    return {
      hardhat: createHardhatNetworkConfig(
        networkConfig.hardhatFork,
        networkConfig.deployerPrivateKey,
        networkConfig.harvestPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      bsc_testnet: createBscTestnetConfig(
        networkConfig.deployerPrivateKey,
        networkConfig.harvestPrivateKey,
        networkConfig.testPrivateKey,
        networkConfig.test2PrivateKey,
      ),
      bsc_mainnet: createBscMainnetConfig(networkConfig.deployerPrivateKey, networkConfig.harvestPrivateKey),
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
    harvest: 1,
    test: 2,
    test2: 3,
    balle: {
      default: '0x9f0D5f45CE8573f43E0BA17876329784be0fd700', // use mainnet address, because we use fork
      56: '0x9f0D5f45CE8573f43E0BA17876329784be0fd700',
      97: '0x8bD237e94CE369F6D78c7bb08B90efc5c6f27A4f',
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
