import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe.only('BalleStakingPoolV1', () => {
  let StakingPool: ContractFactory
  let stakingPool: Contract
  let balle: Contract
  let rewardDistribution: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory', async () => {
    StakingPool = await ethers.getContractFactory('BalleStakingPoolV1')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      rewardDistribution = await ethers.getContract('BalleRewardDistribution')
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
      const stakingPool = await StakingPool.deploy(balle.address, balle.address, rewardDistribution.address)
      await stakingPool.deployed()

      expect(await stakingPool.stakedToken()).to.be.equal(balle.address)
      expect(await stakingPool.rewardToken()).to.be.equal(balle.address)
      expect(await stakingPool.rewardDistribution()).to.be.equal(rewardDistribution.address)
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
})
