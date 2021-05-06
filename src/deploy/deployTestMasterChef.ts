import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const CAKE = await deployments.get('CAKE')

  await deploy('MasterChef', {
    from: deployer,
    args: [CAKE.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre

  if (network.name == 'bsc_testnet') {
    // deploy to testnet
    return false
  }
  return true
}
deploy.tags = ['MasterChef']
deploy.dependencies = ['CAKE']
export default deploy
