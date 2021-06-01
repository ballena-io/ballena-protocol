import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, harvester } = await getNamedAccounts()
  const CAKE = await deployments.get('CAKE')
  const MasterChef = await deployments.get('MasterChef')
  const BalleRewardFund = await deployments.get('BalleRewardFund')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const BalleMaster = await deployments.get('BalleMaster')
  const wbnbAddress = '0xae13d989dac2f0debff460ac112a837c89baa7cd'
  const addresses = [
    '0x8EB36F0272AC65B84b36Aa1980D5F3ec46b008b4', // LP Token address
    wbnbAddress,
    CAKE.address,
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
  const cakeToToken1Path = [CAKE.address]

  await deploy('TestPlanStratCAKE-BNB', {
    contract: 'StratPancakeLpV3',
    from: deployer,
    args: [addresses, 4, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
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
deploy.tags = ['TestPlanStratCAKE-BNB']
deploy.dependencies = ['CAKE', 'MasterChef', 'BalleRewardFund', 'BalleTreasury', 'BALLEv2', 'BalleMaster']
export default deploy
