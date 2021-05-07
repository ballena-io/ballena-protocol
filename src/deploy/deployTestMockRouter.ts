import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const TestLP = await deployments.get('TestLP')

  await deploy('MockRouter', {
    from: deployer,
    args: [TestLP.address],
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
deploy.tags = ['MockRouter']
deploy.dependencies = ['TestLP']
export default deploy
