import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

// Pancake CAKE Strategy data
const stratName = 'StratBalleLp_BALLE-BNB'
const lpToken = '0xa4C9418d4CE79cD2b5d64E08D91B7D00cEC40dC3' // only mainnet address needed

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

  if (network.name == 'bsc_mainnet') {
    // deploy only on bsc_mainnet
    return false
  }
  return true
}
deploy.tags = [stratName]
deploy.dependencies = ['BalleMaster']
export default deploy
