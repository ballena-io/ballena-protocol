import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleMaster = await deployments.get('BalleMaster')
  const CakeLP = await deployments.get('CakeLP')

  await deploy('TestStrategy', {
    from: deployer,
    args: [BalleMaster.address, CakeLP.address, CakeLP.address],
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
deploy.tags = ['TestStrategy']
deploy.dependencies = ['TokenA', 'TokenB', 'CAKE', 'CakeLP', 'BalleMaster']
export default deploy
