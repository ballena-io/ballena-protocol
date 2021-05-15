import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const TestLP = await deployments.get('TestLP')
  const WBNB = await deployments.get('WBNB')
  const TokenA = await deployments.get('TokenA')
  const CAKE = await deployments.get('CAKE')
  const MockRouter = await deployments.get('MockRouter')
  const MockMasterChef = await deployments.get('MockMasterChef')
  const MockRewardPot = await deployments.get('MockRewardPot')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const addresses = [
    TestLP.address,
    WBNB.address,
    TokenA.address,
    CAKE.address,
    MockRouter.address,
    MockMasterChef.address,
    deployer,
    deployer,
    MockRewardPot.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, WBNB.address, BALLE.address]
  const cakeToToken0Path = [CAKE.address, WBNB.address]
  const cakeToToken1Path = [CAKE.address, WBNB.address, TokenA.address]

  await deploy('StratPancakeLpV1', {
    from: deployer,
    args: [addresses, 1, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
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
deploy.tags = ['StratPancakeLpV1']
deploy.dependencies = [
  'WBNB',
  'TokenA',
  'CAKE',
  'TestLP',
  'MockRouter',
  'MockMasterChef',
  'MockRewardPot',
  'BalleTreasury',
  'BALLEv2',
]
export default deploy
