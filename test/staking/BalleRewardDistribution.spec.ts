import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleRewardDistribution', () => {
  let RewardDistribution: ContractFactory
  let rewardDistribution: Contract
  let balle: Contract
  let balleMaster: Contract
  let treasury: Contract
  let rewardFund: Contract
  let stakingPool: Contract
  let rewarder: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory', async () => {
    RewardDistribution = await ethers.getContractFactory('BalleRewardDistribution')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      treasury = await ethers.getContract('BalleTreasury')
      rewardFund = await ethers.getContract('BalleRewardFund')
    })

    it('should fail on zero balle address', async () => {
      await expect(
        RewardDistribution.deploy(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS),
      ).to.be.revertedWith('!balle')
    })

    it('should fail on zero BalleMaster address', async () => {
      await expect(
        RewardDistribution.deploy(balle.address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS),
      ).to.be.revertedWith('!balleMaster')
    })

    it('should fail on zero treasury address', async () => {
      await expect(
        RewardDistribution.deploy(balle.address, balleMaster.address, ZERO_ADDRESS, ZERO_ADDRESS),
      ).to.be.revertedWith('!treasury')
    })

    it('should fail on zero rewardFund address', async () => {
      await expect(
        RewardDistribution.deploy(balle.address, balleMaster.address, treasury.address, ZERO_ADDRESS),
      ).to.be.revertedWith('!rewardFund')
    })

    it('should build a valid RewardDistribution', async () => {
      const rewardDistribution = await RewardDistribution.deploy(
        balle.address,
        balleMaster.address,
        treasury.address,
        rewardFund.address,
      )
      await rewardDistribution.deployed()

      expect(await rewardDistribution.balle()).to.be.equal(balle.address)
      expect(await rewardDistribution.balleMaster()).to.be.equal(balleMaster.address)
      expect(await rewardDistribution.treasury()).to.be.equal(treasury.address)
      expect(await rewardDistribution.rewardFund()).to.be.equal(rewardFund.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
    })

    it('should revert if not owner address calls setTreasury()', async () => {
      await expect(rewardDistribution.connect(test).setTreasury(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setRewardFund()', async () => {
      await expect(rewardDistribution.connect(test).setRewardFund(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setStakingPool()', async () => {
      await expect(rewardDistribution.connect(test).setStakingPool(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls setRewarder()', async () => {
      await expect(rewardDistribution.connect(test).setRewarder(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls distributeReward()', async () => {
      await expect(rewardDistribution.connect(test).distributeReward(0, 0, 0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls inCaseTokensGetStuck()', async () => {
      await expect(
        rewardDistribution.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setTreasury()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
    })

    it('should revert if zero address', async () => {
      await expect(rewardDistribution.connect(deployer).setTreasury(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new Treasury address', async () => {
      await rewardDistribution.connect(deployer).setTreasury(test.address)
      expect(await rewardDistribution.treasury()).to.be.equal(test.address)
    })
  })

  describe('Test setRewardFund()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
    })

    it('should revert if zero address', async () => {
      await expect(rewardDistribution.connect(deployer).setRewardFund(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new RewardFund address', async () => {
      await rewardDistribution.connect(deployer).setRewardFund(test.address)
      expect(await rewardDistribution.rewardFund()).to.be.equal(test.address)
    })
  })

  describe('Test setStakingPool()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
    })

    it('should revert if zero address', async () => {
      await expect(rewardDistribution.connect(deployer).setStakingPool(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new stakingPool address', async () => {
      await rewardDistribution.connect(deployer).setStakingPool(test.address)
      expect(await rewardDistribution.stakingPool()).to.be.equal(test.address)
    })
  })

  describe('Test setRewarder()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
    })

    it('should revert if zero address', async () => {
      await expect(rewardDistribution.connect(deployer).setRewarder(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new Rewarder address', async () => {
      await rewardDistribution.connect(deployer).setRewarder(test.address)
      expect(await rewardDistribution.rewarder()).to.be.equal(test.address)
    })
  })

  describe('Test distributeReward()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      rewardFund = await ethers.getContract('BalleRewardFund')
      treasury = await ethers.getContract('BalleTreasury')
      stakingPool = await ethers.getContract('BalleStakingPoolV1')
      rewarder = await ethers.getContract('BalleRewarder')
      // Setup BALLE balance.
      await balle.mint(rewardFund.address, expandTo18Decimals(5))
      expect(await balle.balanceOf(rewardFund.address)).to.be.equal(expandTo18Decimals(5))
      expect(await balle.balanceOf(rewarder.address)).to.be.equal(0)
      // Setup BALLE minter
      await balle.addMinter(rewardDistribution.address)
      // Setup rewardDistribution on BalleRewardFund contract.
      await rewardFund.setRewardDistribution(rewardDistribution.address)
    })

    it('should revert if duration < min duration', async () => {
      await expect(rewardDistribution.connect(deployer).distributeReward(100, 0, 0)).to.be.revertedWith('!min duration')
    })

    it('should revert if duration > max duration', async () => {
      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60 + 1, 0, 0),
      ).to.be.revertedWith('!max duration')
    })

    it('should revert if zero base reward amount', async () => {
      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(0), 0),
      ).to.be.revertedWith('!baseRewardAmount')
    })

    it('should revert if zero multiplier', async () => {
      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(10), 10),
      ).to.be.revertedWith('!multiplier')
    })

    it('should revert if stakingPool address not set', async () => {
      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(1), 1000),
      ).to.be.revertedWith('!stakingPool')
    })

    it('should revert if rewarder address not set', async () => {
      await rewardDistribution.connect(deployer).setStakingPool(stakingPool.address)
      expect(await rewardDistribution.stakingPool()).to.be.equal(stakingPool.address)

      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(1), 1000),
      ).to.be.revertedWith('!rewarder')
    })

    it('should revert if rewardFund has not enougth balance', async () => {
      await rewardDistribution.connect(deployer).setRewarder(rewarder.address)
      expect(await rewardDistribution.rewarder()).to.be.equal(rewarder.address)

      await expect(
        rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(100), 1000),
      ).to.be.revertedWith('!rewardFundBalance')
    })

    it('should distributeReward', async () => {
      await expect(rewardDistribution.connect(deployer).distributeReward(7 * 24 * 60 * 60, expandTo18Decimals(1), 1000))
        .to.emit(rewardDistribution, 'BalleRewardDistributed')
        .withArgs(
          stakingPool.address,
          expandTo18Decimals(1),
          expandTo18Decimals(9),
          expandTo18Decimals(1),
          7 * 24 * 60 * 20,
          1000,
        )

      // check values
      expect(await balle.balanceOf(rewardFund.address)).to.be.equal(expandTo18Decimals(4))
      expect(await balle.balanceOf(rewarder.address)).to.be.equal(expandTo18Decimals(10))
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
      tokenA = await ethers.getContract('TokenA')
      // setup TokenA balance
      await tokenA.mint(rewardDistribution.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(rewardDistribution.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no to address', async () => {
      await expect(
        rewardDistribution.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero address')
    })

    it('should transfer tokens', async () => {
      await rewardDistribution
        .connect(deployer)
        .inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), test.address)
      expect(await tokenA.balanceOf(rewardDistribution.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
