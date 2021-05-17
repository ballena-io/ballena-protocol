import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  const BalleRewardDistribution = await deployments.get('BalleRewardDistribution')

  await deploy('BalleStakingPoolV1', {
    from: deployer,
    args: [BalleV2.address, BalleV2.address, BalleRewardDistribution.address, deployer],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleStakingPoolV1']
deploy.dependencies = ['BALLEv2', 'BalleRewardDistribution']
export default deploy
