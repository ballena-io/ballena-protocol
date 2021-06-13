import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleRewarder', () => {
  let BalleRewarder: ContractFactory
  let balleRewarder: Contract
  let balle: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory', async () => {
    BalleRewarder = await ethers.getContractFactory('BalleRewarder')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should fail on zero balle address', async () => {
      await expect(BalleRewarder.deploy(ZERO_ADDRESS, deployer.address)).to.be.revertedWith('!balle')
    })

    it('should fail on zero staking pool address', async () => {
      await expect(BalleRewarder.deploy(deployer.address, ZERO_ADDRESS)).to.be.revertedWith('!stakingPool')
    })

    it('should build a valid BalleRewarder', async () => {
      const balleRewarder = await BalleRewarder.deploy(balle.address, deployer.address)
      await balleRewarder.deployed()

      expect(await balleRewarder.balle()).to.be.equal(balle.address)
      expect(await balleRewarder.stakingPool()).to.be.equal(deployer.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewarder = await ethers.getContract('BalleRewarder')
    })

    it('should revert if not owner address calls setStakingPool()', async () => {
      await expect(balleRewarder.connect(test).setStakingPool(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not stakingPool address calls sendReward()', async () => {
      await expect(
        balleRewarder.connect(test).sendReward(ZERO_ADDRESS, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!stakingPool')
    })

    it('should revert if not owner address calls inCaseTokensGetStuck()', async () => {
      await expect(
        balleRewarder.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setStakingPool()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewarder = await ethers.getContract('BalleRewarder')
    })

    it('should revert if zero address', async () => {
      await expect(balleRewarder.connect(deployer).setStakingPool(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new stakingPool address', async () => {
      await balleRewarder.connect(deployer).setStakingPool(test.address)
      expect(await balleRewarder.stakingPool()).to.be.equal(test.address)
    })

    it('should allow to call sendReward', async () => {
      await expect(
        balleRewarder.connect(test).sendReward(ZERO_ADDRESS, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!user')
    })
  })

  describe('Test sendReward()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewarder = await ethers.getContract('BalleRewarder')
      balle = await ethers.getContract('BALLEv2')
      // setup BALLE balance
      await balle.mint(balleRewarder.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(balleRewarder.address)).to.be.equal(expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
    })

    it('should revert if zero address', async () => {
      await expect(
        balleRewarder.connect(deployer).sendReward(ZERO_ADDRESS, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!user')
    })

    it('should revert if no BALLE token', async () => {
      await expect(
        balleRewarder.connect(deployer).sendReward(test.address, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!token')
    })

    it('should revert if zero amount', async () => {
      await expect(
        balleRewarder.connect(deployer).sendReward(test.address, balle.address, expandTo18Decimals(0)),
      ).to.be.revertedWith('!amount')
    })

    it('should sendReward', async () => {
      await balleRewarder.connect(deployer).sendReward(test.address, balle.address, expandTo18Decimals(100))

      // check values
      expect(await balle.balanceOf(balleRewarder.address)).to.be.equal(expandTo18Decimals(400))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleRewarder = await ethers.getContract('BalleRewarder')
      balle = await ethers.getContract('BALLEv2')
      tokenA = await ethers.getContract('TokenA')
      // setup TokenA balance
      await tokenA.mint(balleRewarder.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(balleRewarder.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no to address', async () => {
      await expect(
        balleRewarder.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero address')
    })

    it('should revert if try to transfer BALLE', async () => {
      await expect(
        balleRewarder.connect(deployer).inCaseTokensGetStuck(balle.address, expandTo18Decimals(50), deployer.address),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer tokens', async () => {
      await balleRewarder.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), test.address)
      expect(await tokenA.balanceOf(balleRewarder.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
