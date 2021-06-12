import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  const BalleRewardDistribution = await deployments.get('BalleRewardDistribution')

  await deploy('BalleStakingPoolV1_2', {
    contract: 'BalleStakingPoolV1',
    from: deployer,
    args: [BalleV2.address, BalleV2.address, BalleRewardDistribution.address],
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
deploy.tags = ['BalleStakingPoolV1_2']
deploy.dependencies = ['BALLEv2', 'BalleRewardDistribution']
export default deploy
