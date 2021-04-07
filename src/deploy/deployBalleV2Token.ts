import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { expandTo18Decimals } from '../utils'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('BALLEv2', {
    from: deployer,
    args: ['BALLEv2', 'BALLE', expandTo18Decimals(40000)],
    log: true,
    deterministicDeployment: false,
  })
}

deploy.dependencies = ['TokenA']
deploy.tags = ['BALLEv2']
export default deploy
