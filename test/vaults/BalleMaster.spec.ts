import { Contract, ContractFactory } from '@ethersproject/contracts'
import { ethers, deployments } from 'hardhat'

describe('BalleMaster', () => {
  let balle: Contract
  let BalleMaster: ContractFactory

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLEv2')

    BalleMaster = await ethers.getContractFactory('BalleMaster')
  })

  describe('Test constructor', () => {
    it('should create contract', async () => {
      await BalleMaster.deploy(balle.address)
    })
  })
})
