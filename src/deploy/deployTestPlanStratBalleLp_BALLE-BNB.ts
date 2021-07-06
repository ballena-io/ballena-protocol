import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

// Pancake CAKE Strategy data
const stratName = 'TestPlanStratBalleLp_BALLE-BNB'
const lpToken = '0x29089e9BdD77ac719Bcb94d6eE1ee34F2fEe8cf8' // only testnet address needed

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleMaster = await deployments.get('BalleMaster')

  await deploy(stratName, {
    contract: 'StratBalleLpV1',
    from: deployer,
    args: [lpToken, BalleMaster.address],
    log: true,
    deterministicDeployment: false,
    gasLimit: 3750000,
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
deploy.tags = [stratName]
deploy.dependencies = ['BalleMaster']
export default deploy
