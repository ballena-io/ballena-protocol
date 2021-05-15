import { Contract } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BalleTreasury', () => {
  let balleTreasury: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory', async () => {
    await deployments.fixture() // not needed, but eslint rule doesn't work!
    // eslint-disable-next-line no-extra-semi
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleTreasury = await ethers.getContract('BalleTreasury')
    })

    it('should revert if not owner address calls withdrawTokens()', async () => {
      await expect(
        balleTreasury.connect(test).withdrawTokens(ZERO_ADDRESS, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls withdrawBnb()', async () => {
      await expect(balleTreasury.connect(test).withdrawBnb(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })
  })

  describe('Test withdrawTokens()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleTreasury = await ethers.getContract('BalleTreasury')
      tokenA = await ethers.getContract('TokenA')
    })

    it('should revert if no token', async () => {
      await expect(balleTreasury.withdrawTokens(ZERO_ADDRESS, ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!token',
      )
    })

    it('should revert if no to address', async () => {
      await expect(
        balleTreasury.withdrawTokens(tokenA.address, ZERO_ADDRESS, expandTo18Decimals(0)),
      ).to.be.revertedWith('!to')
    })

    it('should withdrawTokens', async () => {
      // setup TokenA balance
      await tokenA.mint(balleTreasury.address, expandTo18Decimals(500))
      expect(await tokenA.balanceOf(balleTreasury.address)).to.be.equal(expandTo18Decimals(500))
      expect(await tokenA.balanceOf(test.address)).to.be.equal(0)

      // call function
      await balleTreasury.withdrawTokens(tokenA.address, test.address, expandTo18Decimals(100))

      // check values
      expect(await tokenA.balanceOf(balleTreasury.address)).to.be.equal(expandTo18Decimals(400))
      expect(await tokenA.balanceOf(test.address)).to.be.equal(expandTo18Decimals(100))
    })
  })

  describe.only('Test withdrawBnb()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleTreasury = await ethers.getContract('BalleTreasury')
    })

    it('should revert if no to address', async () => {
      await expect(balleTreasury.withdrawBnb(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith('!to')
    })

    it('should revert if no amount on contract', async () => {
      await expect(balleTreasury.withdrawBnb(test.address, expandTo18Decimals(10))).to.be.revertedWith('!amount')
    })

    it('should withdrawBnb', async () => {
      // setup balances
      await deployer.sendTransaction({
        to: balleTreasury.address,
        value: expandTo18Decimals(50),
      })
      expect(await test.getBalance()).to.be.equal(expandTo18Decimals(100))
      expect(await ethers.provider.getBalance(balleTreasury.address)).to.be.equal(expandTo18Decimals(50))

      // call function
      await balleTreasury.withdrawBnb(test.address, expandTo18Decimals(10))

      // check values
      expect(await test.getBalance()).to.be.equal(expandTo18Decimals(110))
      expect(await ethers.provider.getBalance(balleTreasury.address)).to.be.equal(expandTo18Decimals(40))
    })
  })
})
