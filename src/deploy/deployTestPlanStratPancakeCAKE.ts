import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

// Pancake CAKE Strategy data
const stratName = 'TestPlanStratPancakeCAKE'

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
    CAKE.address,
    '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3', // Testnet router address
    MasterChef.address,
    BalleMaster.address,
    harvester,
    BalleRewardFund.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, wbnb, BALLE.address]

  await deploy(stratName, {
    contract: 'StratPancakeCakeV1',
    from: deployer,
    args: [addresses, cakeToBallePath],
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
