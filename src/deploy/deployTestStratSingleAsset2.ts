import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleMaster = await deployments.get('BalleMaster')
  const TokenB = await deployments.get('TokenB')

  await deploy('TestStratSingleAsset2', {
    contract: 'TestStrategy',
    from: deployer,
    args: [BalleMaster.address, TokenB.address],
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
deploy.tags = ['TestStratSingleAsset2']
deploy.dependencies = ['TokenB', 'BalleMaster']
export default deploy
