import { HardhatUserConfig } from 'hardhat/config'
// import "hardhat-deploy"
// import "hardhat-deploy-ethers"
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'solidity-coverage'

import networkConfig from './.env.local.json'

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
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    bsc_testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [networkConfig.deployerPrivateKey, networkConfig.testPrivateKey],
    },
    bsc_mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [networkConfig.deployerPrivateKey],
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  etherscan: {
    apiKey: networkConfig.bscscanApiKey,
  },
}

export default config
