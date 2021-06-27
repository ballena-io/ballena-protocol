import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

// Pancake LP Strategy data (only for BUSD-BNB)
const stratName = 'TestPlanStratPancakeLp_BUSD-BNB'
const lpToken = '0xb51e4d3F60c8453AdCa52797F9FA1481A6E13A7A' // only testnet address needed
const pid = 5 // MasterChef pool ID

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, harvester, wbnb, busd } = await getNamedAccounts()
  const BalleRewardFund = await deployments.get('BalleRewardFund')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const BalleMaster = await deployments.get('BalleMaster')
  const CAKE = await deployments.get('CAKE')
  const MasterChef = await deployments.get('MasterChef')
  const addresses = [
    lpToken, // LP Token address
    busd,
    wbnb,
    CAKE.address,
    '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3', // Testnet router address
    MasterChef.address,
    BalleMaster.address,
    harvester,
    BalleRewardFund.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, wbnb, BALLE.address]
  const cakeToToken0Path = [CAKE.address, busd]
  const cakeToToken1Path = [CAKE.address, wbnb]

  await deploy(stratName, {
    contract: 'StratPancakeLpV3',
    from: deployer,
    args: [addresses, pid, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
    log: true,
    deterministicDeployment: false,
    gasLimit: 3750000,
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
deploy.tags = [stratName]
deploy.dependencies = ['CAKE', 'MasterChef', 'BalleRewardFund', 'BalleTreasury', 'BALLEv2', 'BalleMaster']
export default deploy
