import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, harvester } = await getNamedAccounts()
  const TokenB = await deployments.get('TokenB')
  const CAKE = await deployments.get('CAKE')
  const MasterChef = await deployments.get('MasterChef')
  const BalleRewardFund = await deployments.get('BalleRewardFund')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const BalleMaster = await deployments.get('BalleMaster')
  const wbnbAddress = '0xae13d989dac2f0debff460ac112a837c89baa7cd'
  const addresses = [
    '0x40a6f287fbf5e1841f76ce0218ff23edcd55f96d', // LP Token address
    wbnbAddress,
    TokenB.address,
    CAKE.address,
    '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3', // Router address
    MasterChef.address,
    BalleMaster.address,
    harvester,
    BalleRewardFund.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, wbnbAddress, BALLE.address]
  const cakeToToken0Path = [CAKE.address, wbnbAddress]
  const cakeToToken1Path = [CAKE.address, wbnbAddress, TokenB.address]

  await deploy('TestPlanStratTokenB-BNB', {
    contract: 'StratPancakeLpV1',
    from: deployer,
    args: [addresses, 2, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre

  if (network.name == 'bsc_testnet') {
    // deploy only on bsc_testnet
    return false
  }
  return true
}
deploy.tags = ['TestPlanStratTokenB-BNB']
deploy.dependencies = ['TokenB', 'CAKE', 'MasterChef', 'BalleRewardFund', 'BalleTreasury', 'BALLEv2']
export default deploy
