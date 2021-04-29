import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleMaster = await deployments.get('BalleMaster')
  const TokenA = await deployments.get('TokenA')

  await deploy('TestStratSingleAsset', {
    contract: 'TestStrategy',
    from: deployer,
    args: [BalleMaster.address, TokenA.address],
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
  if (network.name == 'bsc_testnet') {
    // deploy to testnet
    return false
  }
  return true
}
deploy.tags = ['TestStratSingleAsset']
deploy.dependencies = ['TokenA', 'BalleMaster']
export default deploy
