import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre
  const { deploy } = deployments
  const { deployer, balle } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')
  let balleV1 = balle

  // If tests network (hardhat), use deployed BALLE instead of real one
  if (network.name == 'hardhat') {
    const Balle = await deployments.get('BALLE')
    balleV1 = Balle.address
  }

  await deploy('BalleMigration', {
    from: deployer,
    args: [balleV1, BalleV2.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleMigration']
deploy.dependencies = ['BALLE', 'BALLEv2']
export default deploy
