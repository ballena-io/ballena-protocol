import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleRewardFund', () => {
  let BalleRewardFund: ContractFactory
  let balleRewardFund: Contract
  let balle: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory', async () => {
    BalleRewardFund = await ethers.getContractFactory('BalleRewardFund')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should fail on invalid parameters', async () => {
      await expect(BalleRewardFund.deploy(ZERO_ADDRESS)).to.be.revertedWith('!balle')
    })

    it('should build a valid BalleRewardFund', async () => {
      const balleRewardFund = await BalleRewardFund.deploy(balle.address)
      await balleRewardFund.deployed()

      expect(await balleRewardFund.balle()).to.be.equal(balle.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewardFund = await ethers.getContract('BalleRewardFund')
    })

    it('should revert if not owner address calls setRewardDistribution()', async () => {
      await expect(balleRewardFund.connect(test).setRewardDistribution(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not rewardDistribution address calls sendRewardAmount()', async () => {
      await expect(
        balleRewardFund.connect(test).sendRewardAmount(ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!rewardDistribution')
    })

    it('should revert if not owner address calls inCaseTokensGetStuck()', async () => {
      await expect(
        balleRewardFund.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setRewardDistribution()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewardFund = await ethers.getContract('BalleRewardFund')
    })

    it('should revert if zero address', async () => {
      await expect(balleRewardFund.connect(deployer).setRewardDistribution(ZERO_ADDRESS)).to.be.revertedWith(
        'zero address',
      )
    })

    it('should set new rewardDistribution address', async () => {
      await balleRewardFund.connect(deployer).setRewardDistribution(test.address)
      expect(await balleRewardFund.rewardDistribution()).to.be.equal(test.address)
    })

    it('should allow to call sendRewardAmount', async () => {
      await expect(
        balleRewardFund.connect(test).sendRewardAmount(ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!rewarder')
    })
  })

  describe('Test sendRewardAmount()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewardFund = await ethers.getContract('BalleRewardFund')
      balle = await ethers.getContract('BALLEv2')
      // setup BALLE balance
      await balle.mint(balleRewardFund.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(balleRewardFund.address)).to.be.equal(expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
    })

    it('should revert if zero address', async () => {
      await expect(
        balleRewardFund.connect(deployer).sendRewardAmount(ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!rewarder')
    })

    it('should revert if zero amount', async () => {
      await expect(
        balleRewardFund.connect(deployer).sendRewardAmount(test.address, expandTo18Decimals(0)),
      ).to.be.revertedWith('!amount')
    })

    it('should sendReward', async () => {
      await balleRewardFund.connect(deployer).sendRewardAmount(test.address, expandTo18Decimals(100))

      // check values
      expect(await balle.balanceOf(balleRewardFund.address)).to.be.equal(expandTo18Decimals(400))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewardFund = await ethers.getContract('BalleRewardFund')
      balle = await ethers.getContract('BALLEv2')
      tokenA = await ethers.getContract('TokenA')
      // setup TokenA balance
      await tokenA.mint(balleRewardFund.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(balleRewardFund.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no token address', async () => {
      await expect(
        balleRewardFund.connect(deployer).inCaseTokensGetStuck(ZERO_ADDRESS, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero token address')
    })

    it('should revert if no to address', async () => {
      await expect(
        balleRewardFund.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero to address')
    })

    it('should revert if no amount', async () => {
      await expect(
        balleRewardFund.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), deployer.address),
      ).to.be.revertedWith('!amount')
    })

    it('should revert if try to transfer BALLE', async () => {
      await expect(
        balleRewardFund.connect(deployer).inCaseTokensGetStuck(balle.address, expandTo18Decimals(50), deployer.address),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer tokens', async () => {
      await balleRewardFund
        .connect(deployer)
        .inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), deployer.address)
      expect(await tokenA.balanceOf(balleRewardFund.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
