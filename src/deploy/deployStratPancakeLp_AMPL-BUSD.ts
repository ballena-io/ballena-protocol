import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

// Pancake LP Strategy data
const stratName = 'StratPancakeLp_AMPL-BUSD'
const lpToken = '0x6E98Beb694Ff1CDb1eE130eDD2b21b0298683d58' // only mainnet address needed
const token = '0xdb021b1b247fe2f1fa57e0a87c748cc1e321f07f' // only mainnet address needed
const pid = 410 // MasterChef pool ID

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, harvester, wbnb, busd } = await getNamedAccounts()
  const BalleRewardFund = await deployments.get('BalleRewardFund')
  const BalleTreasury = await deployments.get('BalleTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const BalleMaster = await deployments.get('BalleMaster')
  const cake = '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82' // only mainnet address needed
  const addresses = [
    lpToken, // LP Token address
    busd,
    token,
    cake,
    '0x10ED43C718714eb63d5aA57B78B54704E256024E', // Router address
    '0x73feaa1eE314F8c655E354234017bE2193C9E24E', // PCS MasterChef address
    BalleMaster.address,
    harvester,
    BalleRewardFund.address,
    BalleTreasury.address,
  ]
  const cakeToBallePath = [cake, wbnb, BALLE.address]
  const cakeToToken0Path = [cake, busd]
  const cakeToToken1Path = [cake, busd, token]

  await deploy(stratName, {
    contract: 'StratPancakeLpV3',
    from: deployer,
    args: [addresses, pid, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
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
deploy.dependencies = ['BalleRewardFund', 'BalleTreasury', 'BALLEv2', 'BalleMaster']
export default deploy
