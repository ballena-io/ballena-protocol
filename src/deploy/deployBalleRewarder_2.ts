import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  const BalleStakingPoolV1 = await deployments.get('BalleStakingPoolV1_2')

  await deploy('BalleRewarder_2', {
    contract: 'BalleRewarder',
    from: deployer,
    args: [BalleV2.address, BalleStakingPoolV1.address],
    log: true,
    deterministicDeployment: false,
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
deploy.tags = ['BalleRewarder_2']
deploy.dependencies = ['BALLEv2', 'BalleStakingPoolV1_2']
export default deploy
