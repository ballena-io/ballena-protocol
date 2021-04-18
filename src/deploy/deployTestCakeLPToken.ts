import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('CakeLP', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre

  if (!network.tags['test']) {
    return true
  }
  if (network.name === 'localhost') {
    return true
  }
  return false
}
deploy.tags = ['CakeLP']
export default deploy
