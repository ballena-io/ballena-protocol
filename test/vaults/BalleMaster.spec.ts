import { Contract, ContractFactory } from '@ethersproject/contracts'
import { ethers, deployments } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from '../shared/expect'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleMaster', () => {
  let balle: Contract
  let BalleMaster: ContractFactory
  let balleMaster: Contract

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLEv2')

    BalleMaster = await ethers.getContractFactory('BalleMaster')
  })

  describe('Test constructor', () => {
    it('should create contract', async () => {
      balleMaster = await BalleMaster.deploy(
        balle.address,
        BigNumber.from('228310502283105'),
        expandTo18Decimals(24000),
      )
      await balleMaster.deployed()

      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(BigNumber.from('228310502283105'))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(24000))
    })
  })

  describe('Manage vaults', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
    })

    it('should revert if anyone (not owner) try to add new vault')
    it('should add new vault')
    it('should get total vault count')
    it('should revert if anyone (not owner) try to modify vault')
    it('should revert if try to modify non existent vault')
    it('should modify vault')
  })

  describe('Deposit & Withdraw', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
    })

    it('should revert if deposit to non existent vault')
    it('should revert if withdraw from non existent vault')
    it('should revert if withdraw from vault with no deposits')
    it('should deposit from user 1')
    it('should withdrawAll from user 1')
    it('should deposit from user 1')
    it('should deposit from user 2')
    it('should partial withdraw from user 1')
    it('should add deposit from user 2')
    it('should withdraw from user 1')
    it('should withdrawAll from user 2')
  })

  describe('Deposit & Withdraw when wantToken != depositToken', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
    })

    it('should deposit from user 1')
    it('should deposit from user 2')
    it('should partial withdraw both tokens from user 1')
    it('should add deposit from user 2')
    it('should withdraw both tokens from user 1')
    it('should withdrawAll both tokens from user 2')
  })

  describe('Rewards calculation', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
    })

    it('should have testing reward parameters', async () => {
      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(expandTo18Decimals(1))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(500))
    })
    it('should add vault with 1x rewards')
    it('should deposit from user 1')
    it('should show pending BALLE for user 1')
    it('should get rewards on add deposit with one vault and one user')
    it('should show pending BALLE for user 1')
    it('should get rewards on withdraw with one vault and one user')
    it('should not show pending BALLE for user 1')
    it('should add vault with 2x rewards')
    it('should deposit from user 1')
    it('should show pending BALLE for user 1')
    it('should get rewards on add deposit with multiple vault and one user')
    it('should show pending BALLE for user 1')
    it('should get rewards on partial withdraw with multiple vault and one user')
    it('should deposit from user 2')
    it('should show pending BALLE for each user')
    it('should get rewards on add deposit with multiple vault and multiple user')
    it('should show pending BALLE for each user')
    it('should get rewards on partial withdraw from user 1 with multiple vault and multiple user')
    it('should show pending BALLE for each user')
    it('should get rewards on withdrawAll from user 2')
    it('should show pending BALLE for user 1')
    it('should not get more rewards when all distributed')
    it('should get rewards on withdrawAll from user 1')
  })

  describe('Emergency functions', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
    })

    it('should deposit from user 1')
    it('should deposit from user 2')
    it('should emergency withdraw from user 1')
    it('should revert if try to transfer stuck BALLE tokens')
    it('should transfer stuck tokens')
  })
})
