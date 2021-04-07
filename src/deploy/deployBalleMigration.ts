import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer, balle } = await getNamedAccounts()
  const BalleV2 = await deployments.get('BALLEv2')

  await deploy('BalleMigration', {
    from: deployer,
    args: [balle, BalleV2.address],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleMigration']
deploy.dependencies = ['BALLE']
deploy.dependencies = ['BALLEv2']
export default deploy
