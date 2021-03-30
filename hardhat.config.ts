import { existsSync, readFileSync } from 'fs'
import { BalleNetworkConfig } from './types/config'
import { HardhatUserConfig, NetworksUserConfig, NetworkUserConfig } from 'hardhat/types'
// import "hardhat-deploy"
// import "hardhat-deploy-ethers"
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'solidity-coverage'

function createBscTestnetConfig(deployerPrivateKey: string, testPrivateKey: string): NetworkUserConfig {
  return {
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    chainId: 97,
    gasPrice: 20000000000,
    accounts: [deployerPrivateKey, testPrivateKey],
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
  if (networkConfig.deployerPrivateKey !== undefined && networkConfig.testPrivateKey !== undefined) {
    return {
      hardhat: {
        allowUnlimitedContractSize: false,
      },
      bsc_testnet: createBscTestnetConfig(networkConfig.deployerPrivateKey, networkConfig.testPrivateKey),
      bsc_mainnet: createBscMainnetConfig(networkConfig.deployerPrivateKey),
    }
  } else {
    return {
      hardhat: {
        allowUnlimitedContractSize: false,
      },
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
