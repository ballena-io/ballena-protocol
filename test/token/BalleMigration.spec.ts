import { Contract, ContractFactory } from '@ethersproject/contracts'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'

describe('BALLE Migration', () => {
  let balle: Contract
  let balleV2: Contract
  let BalleMigration: ContractFactory

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLE')
    balleV2 = await ethers.getContract('BALLEv2')

    BalleMigration = await ethers.getContractFactory('BalleMigration')
  })

  describe('Test constructor', () => {
    it('should fail on zero BALLE address', async () => {
      await expect(BalleMigration.deploy(ZERO_ADDRESS, balleV2.address)).to.be.revertedWith('BALLE address not valid')
    })

    it('should fail on zero BALLEv2 address', async () => {
      await expect(BalleMigration.deploy(balle.address, ZERO_ADDRESS)).to.be.revertedWith('BALLEv2 address not valid')
    })

    it('should fail on same BALLE and BALLEv2 address', async () => {
      await expect(BalleMigration.deploy(balleV2.address, balleV2.address)).to.be.revertedWith('Invalid address')
    })

    it('should create contract with valid params', async () => {
      await BalleMigration.deploy(balle.address, balleV2.address)
    })
  })

  describe('Test migration', () => {
    it('should fail migrate if not allowance')

    it('should migrate tokens')
  })
})
