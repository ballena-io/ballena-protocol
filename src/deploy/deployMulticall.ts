import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('Multicall', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.tags = ['Multicall']
export default deploy
