import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { BigNumber } from 'ethers'
import { expandTo18Decimals } from '../utils'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  let ballePerBlock = BigNumber.from('228310502283105')
  let balleTotalRewards = expandTo18Decimals(24000)

  // If tests network, use testing reward params, unless fork node
  if (network.tags['test'] && network.name !== 'localhost') {
    ballePerBlock = expandTo18Decimals(1)
    balleTotalRewards = expandTo18Decimals(500)
  }

  await deploy('BalleMaster', {
    from: deployer,
    args: [BalleV2.address, ballePerBlock, balleTotalRewards],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleMaster']
deploy.dependencies = ['BALLEv2']
export default deploy
