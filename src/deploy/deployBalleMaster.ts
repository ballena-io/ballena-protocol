import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { BigNumber } from 'ethers'
import { expandTo18Decimals } from '../utils'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  let ballePerBlock = BigNumber.from('2283105022831050')
  let balleTotalRewards = expandTo18Decimals(24000)
  let startBlock = 7779016

  // If tests network (hardhat), use testing reward params
  if (network.name == 'hardhat') {
    ballePerBlock = expandTo18Decimals(1)
    balleTotalRewards = expandTo18Decimals(50)
    startBlock = 0
  }

  await deploy('BalleMaster', {
    from: deployer,
    args: [BalleV2.address, ballePerBlock, balleTotalRewards, startBlock],
    log: true,
    deterministicDeployment: false,
  })

  if (network.name == 'hardhat') {
    // Add BalleMaster as BALLE minter
    const BalleMaster = await deployments.get('BalleMaster')
    const balle = await ethers.getContractAt('BALLEv2', BalleV2.address)
    await balle.addMinter(BalleMaster.address)
  }
}

deploy.tags = ['BalleMaster']
deploy.dependencies = ['BALLEv2']
export default deploy
