import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { MaxUint256, ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleStakingPoolV1', () => {
  let StakingPool: ContractFactory
  let stakingPool: Contract
  let balle: Contract
  let rewarder: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress, test2: SignerWithAddress

  before('Load contract factory', async () => {
    StakingPool = await ethers.getContractFactory('BalleStakingPoolV1')
    ;({ deployer, test, test2 } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should fail on zero staked token address', async () => {
      await expect(StakingPool.deploy(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith('!stakedToken')
    })

    it('should fail on zero reward token address', async () => {
      await expect(StakingPool.deploy(balle.address, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith('!rewardToken')
    })

    it('should fail on zero rewardDistribution address', async () => {
      await expect(StakingPool.deploy(balle.address, balle.address, ZERO_ADDRESS)).to.be.revertedWith(
        '!rewardDistribution',
      )
    })

    it('should build a valid StakingPool', async () => {
      const stakingPool = await StakingPool.deploy(balle.address, balle.address, test.address)
      await stakingPool.deployed()

      expect(await stakingPool.stakedToken()).to.be.equal(balle.address)
      expect(await stakingPool.rewardToken()).to.be.equal(balle.address)
      expect(await stakingPool.rewardDistribution()).to.be.equal(test.address)
      expect(await stakingPool.owner()).to.be.equal(deployer.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
    })

    it('should revert if not owner address calls setRewarder()', async () => {
      await expect(stakingPool.connect(test).setRewarder(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setRewardDistribution()', async () => {
      await expect(stakingPool.connect(test).setRewardDistribution(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setSecurity()', async () => {
      await expect(stakingPool.connect(test).setSecurity(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls addReward()', async () => {
      await expect(stakingPool.connect(test).addReward(0, 0, 0, 0)).to.be.revertedWith('!rewardDistribution')
    })

    it('should revert if not owner address calls stopRewards()', async () => {
      await expect(stakingPool.connect(test).stopRewards()).to.be.revertedWith('!security')
    })

    it('should revert if not owner address calls finish()', async () => {
      await expect(stakingPool.connect(test).finish()).to.be.revertedWith('!security')
    })

    it('should revert if not owner address calls inCaseTokensGetStuck()', async () => {
      await expect(
        stakingPool.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setRewarder()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
    })

    it('should revert if zero address', async () => {
      await expect(stakingPool.connect(deployer).setRewarder(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new Rewarder address', async () => {
      await stakingPool.connect(deployer).setRewarder(test.address)
      expect(await stakingPool.rewarder()).to.be.equal(test.address)
    })
  })

  describe('Test setRewardDistribution()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
    })

    it('should revert if zero address', async () => {
      await expect(stakingPool.connect(deployer).setRewardDistribution(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new RewardDistribution address', async () => {
      await stakingPool.connect(deployer).setRewardDistribution(test.address)
      expect(await stakingPool.rewardDistribution()).to.be.equal(test.address)
    })
  })

  describe('Test setSecurity()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
    })

    it('should revert if zero address', async () => {
      await expect(stakingPool.connect(deployer).setSecurity(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new Security address', async () => {
      await stakingPool.connect(deployer).setSecurity(test.address)
      expect(await stakingPool.security()).to.be.equal(test.address)
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
      tokenA = await ethers.getContract('TokenA')
      // setup TokenA balance
      await tokenA.mint(stakingPool.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no to address', async () => {
      await expect(
        stakingPool.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero address')
    })

    it('should revert if try to transfer staked tokens (BALLE)', async () => {
      await expect(
        stakingPool.connect(deployer).inCaseTokensGetStuck(balle.address, expandTo18Decimals(50), test.address),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer tokens', async () => {
      await stakingPool.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), test.address)
      expect(await tokenA.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })
  })

  describe('Test stake() and withdraw()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
      balle = await ethers.getContract('BALLEv2')
      // setup BALLE balance
      await balle.mint(test.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
      await balle.mint(test2.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(100))
      // approve BALLE allowance to StakingPool contract
      balle.connect(test).approve(stakingPool.address, MaxUint256)
      balle.connect(test2).approve(stakingPool.address, MaxUint256)
    })

    it('should revert if no amount', async () => {
      await expect(stakingPool.connect(test).stake(0)).to.be.revertedWith('!amount')
    })

    it('should revert if no rewarder', async () => {
      await expect(stakingPool.connect(test).stake(expandTo18Decimals(10))).to.be.revertedWith('!rewarder')
    })

    it('should set new Rewarder address', async () => {
      await stakingPool.connect(deployer).setRewarder(deployer.address)
      expect(await stakingPool.rewarder()).to.be.equal(deployer.address)
    })

    it('should stake tokens from user 1', async () => {
      await expect(stakingPool.connect(test).stake(expandTo18Decimals(50)))
        .to.emit(stakingPool, 'Deposit')
        .withArgs(test.address, expandTo18Decimals(50), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })

    it('should stake tokens from user 2', async () => {
      await expect(stakingPool.connect(test2).stake(expandTo18Decimals(70)))
        .to.emit(stakingPool, 'Deposit')
        .withArgs(test2.address, expandTo18Decimals(70), 0)
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(30))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(120))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(120))
      expect(await stakingPool.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(70))
    })

    it('should stake all tokens from user 1', async () => {
      await expect(stakingPool.connect(test).stakeAll())
        .to.emit(stakingPool, 'Deposit')
        .withArgs(test.address, expandTo18Decimals(50), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(170))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(170))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should withdraw tokens from user 1', async () => {
      await expect(stakingPool.connect(test).withdraw(expandTo18Decimals(25)))
        .to.emit(stakingPool, 'Withdraw')
        .withArgs(test.address, expandTo18Decimals(25), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(25))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(145))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(145))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(expandTo18Decimals(75))
    })

    it('should withdraw tokens from user 2', async () => {
      await expect(stakingPool.connect(test2).withdraw(expandTo18Decimals(70)))
        .to.emit(stakingPool, 'Withdraw')
        .withArgs(test2.address, expandTo18Decimals(70), 0)
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(75))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(75))
      expect(await stakingPool.balanceOf(test2.address)).to.be.equal(0)
    })

    it('should withdraw all tokens from user 1', async () => {
      await expect(stakingPool.connect(test).withdrawAll())
        .to.emit(stakingPool, 'Withdraw')
        .withArgs(test.address, expandTo18Decimals(75), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(0)
      expect(await stakingPool.totalSupply()).to.be.equal(0)
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(0)
    })

    it('should stake tokens from user 1', async () => {
      await expect(stakingPool.connect(test).stake(expandTo18Decimals(50)))
        .to.emit(stakingPool, 'Deposit')
        .withArgs(test.address, expandTo18Decimals(50), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })

    it('should stake tokens from user 2', async () => {
      await expect(stakingPool.connect(test2).stake(expandTo18Decimals(25)))
        .to.emit(stakingPool, 'Deposit')
        .withArgs(test2.address, expandTo18Decimals(25), 0)
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(75))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(75))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(75))
      expect(await stakingPool.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(25))
    })

    it('should finish pool', async () => {
      expect(stakingPool.connect(deployer).finish()).to.emit(stakingPool, 'PoolFinish')
    })

    it('should revert stake because pool finished', async () => {
      await expect(stakingPool.connect(test).stake(expandTo18Decimals(10))).to.be.revertedWith('finished')
    })

    it('should revert if try to finish again', async () => {
      expect(stakingPool.connect(deployer).finish()).to.be.revertedWith('finished')
    })

    it('should withdraw tokens from user 1 with finished pool', async () => {
      await expect(stakingPool.connect(test).withdraw(expandTo18Decimals(25)))
        .to.emit(stakingPool, 'Withdraw')
        .withArgs(test.address, expandTo18Decimals(25), 0)
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(75))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(50))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(expandTo18Decimals(25))
    })

    it('should emergencyWithdraw tokens from user 1', async () => {
      await expect(stakingPool.connect(test).emergencyWithdraw())
        .to.emit(stakingPool, 'EmergencyWithdraw')
        .withArgs(test.address, expandTo18Decimals(25))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balle.balanceOf(stakingPool.address)).to.be.equal(expandTo18Decimals(25))
      expect(await stakingPool.totalSupply()).to.be.equal(expandTo18Decimals(25))
      expect(await stakingPool.balanceOf(test.address)).to.be.equal(0)
    })
  })

  describe.skip('Test reward distribution', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      rewarder = await ethers.getContract('BalleRewarder')
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
      // setup BALLE balance
      await balle.mint(rewarder.address, expandTo18Decimals(1))
      expect(await balle.balanceOf(rewarder.address)).to.be.equal(expandTo18Decimals(1))
      await balle.mint(test.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
      await balle.mint(test2.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(100))
      // approve BALLE allowance to StakingPool contract
      balle.connect(test).approve(stakingPool.address, MaxUint256)
      balle.connect(test2).approve(stakingPool.address, MaxUint256)
    })

    it('should set rewarder address', async () => {
      await expect(stakingPool.connect(deployer).setRewarder(rewarder.address))
      expect(await stakingPool.rewarder()).to.be.equal(rewarder.address)
    })
  })
})
