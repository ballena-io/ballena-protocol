import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from '../shared/expect'
import { getBlockNumber, mineBlock } from '../shared/hardhatNode'
import { expandTo18Decimals } from '../../src/utils'
import { MaxUint256 } from '../../src/utils/constants'

describe('BalleMaster', () => {
  let balle: Contract
  let BalleMaster: ContractFactory
  let balleMaster: Contract
  let testStrategy: Contract
  let testLP: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress
  let LocalStrategy: ContractFactory
  let localStrategy1: Contract
  let localStrategy2: Contract

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLEv2')

    BalleMaster = await ethers.getContractFactory('BalleMaster')
    ;({ deployer, test } = await ethers.getNamedSigners())
    LocalStrategy = await ethers.getContractFactory('TestStrategy')
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

  describe('Deposit & withdraw', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')

      // setup TEST_LP balance
      await testLP.connect(deployer).mint(deployer.address, expandTo18Decimals(500))
      await testLP.connect(deployer).mint(test.address, expandTo18Decimals(500))
      expect(await testLP.connect(deployer).balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.connect(deployer).balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
      // create new vault
      balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should revert if deposit to non existent vault', async () => {
      expect(balleMaster.connect(deployer).deposit(99, expandTo18Decimals(100))).to.be.revertedWith('!vault')
    })

    it('should revert if withdraw from non existent vault', async () => {
      expect(balleMaster.connect(deployer).withdraw(99, expandTo18Decimals(100))).to.be.revertedWith('!vault')
    })

    it('should revert if withdraw from vault with no deposits', async () => {
      expect(balleMaster.connect(deployer).withdraw(0, expandTo18Decimals(100))).to.be.revertedWith('!sharesTotal')
    })

    it('should deposit from user 1', async () => {
      expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.connect(deployer).stakedTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should harvest from user 1', async () => {
      expect(balleMaster.connect(deployer).withdraw(0, 0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, 0, 0)
    })

    it('should revert withdraw from user 2', async () => {
      expect(balleMaster.connect(test).withdraw(0, 0)).to.be.revertedWith('!user.shares')
    })

    it('should withdrawAll from user 1', async () => {
      expect(balleMaster.connect(deployer).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
    })

    it('should deposit from user 2', async () => {
      expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(150)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(150), 0)
      expect(await balleMaster.connect(test).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(150))
    })

    it('should depositAll from user 2', async () => {
      expect(balleMaster.connect(test).depositAll(0))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(350), 0)
      expect(await balleMaster.connect(test).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(500))
    })

    it('should partial withdraw from user 2', async () => {
      expect(balleMaster.connect(test).withdraw(0, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(200), 0)
      expect(await balleMaster.connect(test).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(300))
    })

    it('should withdraw from user 2', async () => {
      expect(balleMaster.connect(test).withdraw(0, expandTo18Decimals(300)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(300), 0)
      expect(await balleMaster.connect(test).stakedTokens(0, test.address)).to.be.equal(0)
    })
  })

  describe('Deposit & Withdraw when wantToken != depositToken', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
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
      testLP = await ethers.getContract('TestLP')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy1.deployed()
      localStrategy2 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy2.deployed()

      // setup TEST_LP balance
      await testLP.connect(deployer).mint(deployer.address, expandTo18Decimals(500))
      await testLP.connect(deployer).mint(test.address, expandTo18Decimals(500))
      expect(await testLP.connect(deployer).balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.connect(deployer).balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
    })

    it('should have testing reward parameters', async () => {
      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(expandTo18Decimals(1))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(50))
    })

    it('should add vault #0', async () => {
      balleMaster.connect(deployer).addVault(testLP.address, testLP.address, localStrategy1.address)
    })

    it('should activate vault #0 with 1x rewards', async () => {
      expect(balleMaster.connect(deployer).activateVaultRewards(0, 100))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(0, 100)
    })

    it('should deposit from user 1 on vault #0', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.connect(deployer).stakedTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
    })

    it('should show pending BALLE for user 1 on vault #0', async () => {
      console.log(await getBlockNumber())
      mineBlock()
      console.log(await getBlockNumber())
      // 1 block of accumulated rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(1))
    })

    it('should get rewards on add deposit with one vault and one user on vault #0', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), expandTo18Decimals(2))
      expect(await balleMaster.connect(deployer).stakedTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(2))
    })

    it('should accumulate BALLE on vault #0', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(2))
    })

    it('should get rewards on withdraw (all amount) with one vault and one user on vault #0', async () => {
      await expect(balleMaster.connect(deployer).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(200), expandTo18Decimals(3))
      expect(await balleMaster.connect(deployer).stakedTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(5))
    })

    it('should not accumulate BALLE on vault #0', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards? (not really!)
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
    })

    it('should deposit from user 2 on vault #0', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.connect(test).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.connect(test).pendingBalle(0, test.address)).to.be.equal(expandTo18Decimals(0))
    })

    it('should add vault #1', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, localStrategy2.address)
      // check pending rewards
      expect(await balleMaster.connect(test).pendingBalle(0, test.address)).to.be.equal(expandTo18Decimals(1))
    })

    it('should activate vault #1 with 2x rewards', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(1, 200))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(1, 200)
      expect(await balleMaster.connect(test).totalAllocPoint()).to.be.equal(300)
      // check pending rewards
      expect(await balleMaster.connect(test).pendingBalle(0, test.address)).to.be.equal(expandTo18Decimals(2))
    })

    it('should accumulate BALLE on vault #0 with new rate', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards with new rate + 2 with old rate
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('2666666666600000000')
    })

    it('should deposit from user 1 on vault #1', async () => {
      await expect(balleMaster.connect(deployer).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), 0)
      expect(await balleMaster.connect(deployer).stakedTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('3000000000000000000')
    })

    it('should accumulate BALLE on vaults #0 and #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('3666666666600000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('1333333333300000000')
    })

    it('should get rewards on add deposit with multiple vault and one user on vault #1', async () => {
      await expect(balleMaster.connect(deployer).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '2000000000000000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('4000000000000000000')
    })

    it('should accumulate BALLE on vaults #0 and #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('4666666666600000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('1333333333200000000')
    })

    it('should get rewards on partial withdraw with multiple vault and one user on vault #1', async () => {
      await expect(balleMaster.connect(deployer).withdraw(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '2000000000000000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5000000000000000000')
    })

    it('should deactivate vault #0 rewards', async () => {
      await expect(balleMaster.connect(deployer).deactivateVaultRewards(0))
        .to.emit(balleMaster, 'DeactivateRewards')
        .withArgs(0)
      expect(await balleMaster.connect(test).totalAllocPoint()).to.be.equal(200)
      // check pending rewards
      expect(await balleMaster.connect(test).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('666666666600000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('2666666666600000000')
    })

    it('should deposit from user 2 on vault #1', async () => {
      await expect(balleMaster.connect(test).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 1, expandTo18Decimals(100), 0)
      expect(await balleMaster.connect(deployer).stakedTokens(1, test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(0))
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('3666666666600000000')
    })

    it('should accumulate BALLE for on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('4666666666600000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(1))
    })

    it('should get rewards on add deposit with multiple vault and multiple user on vault #1', async () => {
      await expect(balleMaster.connect(test).deposit(1, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 1, expandTo18Decimals(200), '1500000000000000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(0))
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('5166666666600000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal('5666666666600000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('1500000000000000000')
    })

    it('should get rewards on withdrawAll from user 1 with multiple vault and multiple user on vault #1', async () => {
      await expect(balleMaster.connect(deployer).withdrawAll(1))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '5916666666600000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(deployer.address)).to.be.equal('14916666666600000000')
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('2250000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('4249999999800000000')
    })

    it('should modify vault #1 with x5 rewards', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(1, 500))
        .to.emit(balleMaster, 'ModifyRewards')
        .withArgs(1, 500)
      expect(await balleMaster.connect(test).totalAllocPoint()).to.be.equal(500)
      // check pending rewards (has no effect because only one active vault, so, gets all anyway)
      expect(await balleMaster.connect(test).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('5250000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('7249999999800000000')
    })

    it('should harvest BALLE rewards for user 1 on vault #1', async () => {
      await expect(balleMaster.connect(test).withdraw(1, 0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 1, 0, '8250000000000000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(test.address)).to.be.equal('9750000000000000000')
      // check pending rewards
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      for (let i = 1; i <= 25; i++) {
        mineBlock()
      }
      // 20 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('13999999999800000000') // 20000000000000000000
    })

    it('should not get more rewards when all distributed', async () => {
      mineBlock()
      mineBlock()
      // no more rewards left
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal('5333333333300000000')
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal('13999999999800000000') // 20000000000000000000
    })

    it('should get rewards on withdrawAll from user 2 on vault #0', async () => {
      await expect(balleMaster.connect(test).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(100), '5333333333300000000')
      expect(await balleMaster.connect(deployer).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(test.address)).to.be.equal('15083333333300000000')
    })

    it('should get rewards on withdrawAll from user 2 on vault #1', async () => {
      await expect(balleMaster.connect(test).withdrawAll(1))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 1, expandTo18Decimals(300), '13999999999800000000')
      expect(await balleMaster.connect(deployer).stakedTokens(1, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balle.connect(deployer).balanceOf(test.address)).to.be.equal('29083333333100000000')
    })

    it('should be all vaults empty', async () => {
      expect(await balleMaster.connect(deployer).stakedTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(0, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).stakedTokens(0, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(0, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).stakedTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(1, deployer.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).stakedTokens(1, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await balleMaster.connect(deployer).pendingBalle(1, test.address)).to.be.equal(expandTo18Decimals(0))
      expect(await testLP.connect(deployer).balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.connect(deployer).balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      expect(await balle.connect(deployer).balanceOf(deployer.address)).to.be.equal('14916666666600000000')
      expect(await balle.connect(deployer).balanceOf(test.address)).to.be.equal('29083333333100000000')
      expect(await balle.connect(deployer).balanceOf(balleMaster.address)).to.be.equal('299999999')
    })
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
