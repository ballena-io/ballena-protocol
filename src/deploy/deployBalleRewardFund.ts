import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')

  await deploy('BalleRewardFund', {
    from: deployer,
    args: [BalleV2.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleRewardFund']
deploy.dependencies = ['BALLEv2']
export default deploy
