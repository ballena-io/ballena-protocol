import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  const BalleMaster = await deployments.get('BalleMaster')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BalleRewardFund = await deployments.get('BalleRewardFund')

  await deploy('BalleRewardDistribution', {
    from: deployer,
    args: [BalleV2.address, BalleMaster.address, BalleTreasury.address, BalleRewardFund.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleRewardDistribution']
deploy.dependencies = ['BALLEv2', 'BalleMaster', 'BalleTreasury', 'BalleRewardFund']
export default deploy
