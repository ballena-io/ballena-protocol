import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const CAKE = await deployments.get('CAKE')
  const TestLP = await deployments.get('TestLP')

  await deploy('MockMasterChef', {
    from: deployer,
    args: [CAKE.address, TestLP.address, '1000000000000000000'],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre

  if (network.name == 'hardhat') {
    // deploy only for tests
    return false
  }
  return true
}
deploy.tags = ['MockMasterChef']
deploy.dependencies = ['CAKE', 'TestLP']
export default deploy
