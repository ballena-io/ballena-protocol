import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('BalleTreasury', {
    from: deployer,
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['BalleTreasury']
export default deploy
