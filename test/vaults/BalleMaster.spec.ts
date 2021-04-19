import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from '../shared/expect'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleMaster', () => {
  let balle: Contract
  let BalleMaster: ContractFactory
  let balleMaster: Contract
  let testStrategy: Contract
  let testLP: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLEv2')

    BalleMaster = await ethers.getContractFactory('BalleMaster')
    ;({ deployer, test } = await ethers.getNamedSigners())
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
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
    })

    it('should revert if anyone (not owner) try to add new vault', async () => {
      expect(
        balleMaster.connect(test).addVault(testLP.address, testLP.address, testStrategy.address),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should add new vault #0', async () => {
      balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should get total vault count', async () => {
      expect(await balleMaster.vaultLength()).to.be.equal(1)
    })

    it('should revert if anyone (not owner) try to activate vault #0 rewards', async () => {
      expect(balleMaster.connect(test).activateVaultRewards(0, 100)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to activate rewards on non existent vault', async () => {
      expect(balleMaster.activateVaultRewards(99, 100)).to.be.revertedWith('!vault')
    })

    it('should revert if try to activate vault #0 rewards with 0 allocPoint', async () => {
      expect(balleMaster.activateVaultRewards(0, 0)).to.be.revertedWith('!allocpoint')
    })

    it('should activate vault #0 rewards', async () => {
      expect(balleMaster.activateVaultRewards(0, 100)).to.emit(balleMaster, 'ActivateRewards').withArgs(0, 100)
    })

    it('should revert if try to activate an already activated vault', async () => {
      expect(balleMaster.activateVaultRewards(0, 100)).to.be.revertedWith('active')
    })

    it('should add new vault #1', async () => {
      balleMaster.addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should revert if try to modify rewards on non active vault', async () => {
      expect(balleMaster.modifyVaultRewards(1, 200)).to.be.revertedWith('!active')
    })

    it('should activate vault #1 rewards', async () => {
      expect(balleMaster.activateVaultRewards(1, 200)).to.emit(balleMaster, 'ActivateRewards').withArgs(1, 200)
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(300)
    })

    it('should revert if anyone (not owner) try to modify vault #1 rewards', async () => {
      expect(balleMaster.connect(test).modifyVaultRewards(1, 100)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to modify rewards on non existent vault', async () => {
      expect(balleMaster.modifyVaultRewards(99, 100)).to.be.revertedWith('!vault')
    })

    it('should revert if try to modify vault #1 rewards with 0 allocPoint', async () => {
      expect(balleMaster.modifyVaultRewards(1, 0)).to.be.revertedWith('!allocpoint')
    })

    it('should modify vault #1 rewards', async () => {
      expect(balleMaster.modifyVaultRewards(1, 500)).to.emit(balleMaster, 'ModifyRewards').withArgs(1, 500)
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(600)
    })

    it('should revert if anyone (not owner) try to deactivate vault #1 rewards', async () => {
      expect(balleMaster.connect(test).deactivateVaultRewards(1)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to deactivate rewards on non existent vault', async () => {
      expect(balleMaster.deactivateVaultRewards(99)).to.be.revertedWith('!vault')
    })

    it('should deactivate vault #1 rewards', async () => {
      expect(balleMaster.deactivateVaultRewards(1)).to.emit(balleMaster, 'DeactivateRewards').withArgs(1)
    })

    it('should revert if try to deactivate already deactivated vault #1', async () => {
      expect(balleMaster.deactivateVaultRewards(1)).to.be.revertedWith('!active')
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(100)
    })
  })

  describe('Deposit, Withdraw & Harvest', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
    })

    it('should revert if deposit to non existent vault')
    it('should revert if withdraw from non existent vault')
    it('should revert if withdraw from vault with no deposits')
    it('should revert if harvest to non existent vault')
    it('should revert if harvest and no shares on vault')
    it('should deposit from user 1')
    it('should harvest from user 1')
    it('should revert harvest from user 2')
    it('should withdrawAll from user 1')
    it('should depositAll from user 1')
    it('should partial withdraw from user 1')
    it('should add deposit from user 2')
    it('should withdraw from user 1')
    it('should withdrawAll from user 2')
  })

  describe('Deposit & Withdraw when wantToken != depositToken', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
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
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
    })

    it('should have testing reward parameters', async () => {
      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(expandTo18Decimals(1))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(500))
    })
    it('should add vault #0')
    it('should activate vault #0 with 1x rewards')
    it('should deposit from user 1 on vault #0')
    it('should show pending BALLE for user 1 on vault #0')
    it('should get rewards on add deposit with one vault and one user on vault #0')
    it('should show pending BALLE for user 1 on vault #0')
    it('should get rewards on withdraw (all amount) with one vault and one user on vault #0')
    it('should not show pending BALLE for user 1 on vault #0')
    it('should deposit from user 2 on vault #0')
    it('should add vault #1')
    it('should activate vault #1 with 2x rewards')
    it('should deposit from user 1 on vault #1')
    it('should show pending BALLE for user 1 on vault #1')
    it('should get rewards on add deposit with multiple vault and one user on vault #1')
    it('should show pending BALLE for user 1 on vault #1')
    it('should get rewards on partial withdraw with multiple vault and one user on vault #1')
    it('should deactivate vault #0 rewards')
    it('should show pending BALLE for user 2 on vault #0')
    it('should deposit from user 2 on vault #1')
    it('should show pending BALLE for each user on vault #1')
    it('should get rewards on add deposit with multiple vault and multiple user on vault #1')
    it('should show pending BALLE for each user on vault #1')
    it('should get rewards on partial withdraw from user 1 with multiple vault and multiple user on vault #1')
    it('should show pending BALLE for each user on vault #1')
    it('should get rewards on withdrawAll from user 2 on vault #1')
    it('should show pending BALLE for user 1 on vault #1')
    it('should modify vault #1 with x5 rewards on vault #1')
    it('should show pending BALLE for user 1 on vault #1')
    it('should harvest BALLE rewards for user 1 on vault #1')
    it('should show pending BALLE for user 1 on vault #1')
    it('should not get more rewards when all distributed')
    it('should get rewards on withdrawAll from user 1 on vault #1')
    it('should show pending BALLE for user 2 on vault #0')
    it('should get rewards on withdrawAll from user 2 on vault #0')
  })

  describe('Emergency functions', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
    })

    it('should deposit from user 1')
    it('should deposit from user 2')
    it('should emergency withdraw from user 1')
    it('should revert if try to transfer stuck BALLE tokens')
    it('should transfer stuck tokens')
  })
})
