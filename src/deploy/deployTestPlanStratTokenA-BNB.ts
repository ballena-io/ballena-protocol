import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const TokenA = await deployments.get('TokenA')
  const CAKE = await deployments.get('CAKE')
  const MasterChef = await deployments.get('MasterChef')
  const MockRewardPot = await deployments.get('MockRewardPot')
  const MockTreasury = await deployments.get('MockTreasury')
  const BALLE = await deployments.get('BALLEv2')
  const wbnbAddress = '0xae13d989dac2f0debff460ac112a837c89baa7cd'
  const addresses = [
    '0x3edd0c7cec29179d45431471e413be197fb31446', // LP Token address
    wbnbAddress,
    TokenA.address,
    CAKE.address,
    '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3', // Router address
    MasterChef.address,
    deployer,
    deployer,
    MockRewardPot.address,
    MockTreasury.address,
  ]
  const cakeToBallePath = [CAKE.address, wbnbAddress, BALLE.address]
  const cakeToToken0Path = [CAKE.address, wbnbAddress]
  const cakeToToken1Path = [CAKE.address, wbnbAddress, TokenA.address]

  await deploy('TestPlanStratTokenA-BNB', {
    contract: 'StratPancakeLpV1',
    from: deployer,
    args: [addresses, 1, cakeToBallePath, cakeToToken0Path, cakeToToken1Path],
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
deploy.tags = ['TestPlanStratTokenA-BNB']
deploy.dependencies = ['TokenA', 'CAKE', 'MasterChef', 'MockRewardPot', 'MockTreasury', 'BALLEv2']
export default deploy
