import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const WBNB = await deployments.get('WBNB')
  const CAKE = await deployments.get('CAKE')
  const MockRouter = await deployments.get('MockRouter')
  const MockMasterChef = await deployments.get('MockMasterChef')
  const BalleRewardFund = await deployments.get('BalleRewardFund')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const addresses = [
    CAKE.address,
    MockRouter.address,
    MockMasterChef.address,
    deployer,
    deployer,
    BalleRewardFund.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, WBNB.address, BALLE.address]

  await deploy('StratPancakeCakeV1', {
    from: deployer,
    args: [addresses, cakeToBallePath],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre

  if (network.name == 'hardhat') {
    // deploy for tests
    return false
  }
  return true
}
deploy.tags = ['StratPancakeCakeV1']
deploy.dependencies = ['WBNB', 'CAKE', 'MockRouter', 'MockMasterChef', 'BalleRewardFund', 'BalleTreasury', 'BALLEv2']
export default deploy
