import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  const BalleStakingPoolV1 = await deployments.get('BalleStakingPoolV1')

  await deploy('BalleRewarder', {
    from: deployer,
    args: [BalleV2.address, BalleStakingPoolV1.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleRewarder']
deploy.dependencies = ['BALLEv2', 'BalleStakingPoolV1']
export default deploy
