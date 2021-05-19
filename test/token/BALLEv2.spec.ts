import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BALLEv2 Token', () => {
  let Balle: ContractFactory
  let balle: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress, test2: SignerWithAddress

  before('Load contract factory', async () => {
    Balle = await ethers.getContractFactory('BALLEv2')
    ;({ deployer, test, test2 } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    it('should fail on invalid parameters', async () => {
      await expect(Balle.deploy('BALLEv2', 'BALLE', 0)).to.be.revertedWith('BALLE: cap is 0')
    })

    it('should build a valid BALLE token', async () => {
      const balle = await Balle.deploy('BALLEv2', 'BALLE', expandTo18Decimals(1000))
      await balle.deployed()

      expect(await balle.name()).to.be.equal('BALLEv2')
      expect(await balle.symbol()).to.be.equal('BALLE')
      expect(await balle.decimals()).to.be.equal(18)
      expect(await balle.totalSupply()).to.be.equal(0)
      expect(await balle.cap()).to.be.equal(expandTo18Decimals(1000))
    })
  })

  describe('Token governance', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should set initial governance to contract creator', async () => {
      expect(await balle.governance()).to.be.equal(deployer.address)
    })

    it('should not allow non governance address to set new governance', async () => {
      const balle = await ethers.getContract('BALLEv2')
      await expect(balle.connect(test).setGovernance(test.address)).to.be.revertedWith('!governance')
    })

    it('should allow governance to set new governance', async () => {
      await expect(balle.setGovernance(test.address)).to.emit(balle, 'SetGovernance').withArgs(test.address)
    })

    it('should not allow zero address to be set as governance', async () => {
      await expect(balle.connect(test).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })
  })

  describe('Token minting', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should allow mint tokens from governance address', async () => {
      await expect(balle.mint(test.address, expandTo18Decimals(500)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
    })

    it('should not allow zero address to be set as minter', async () => {
      await expect(balle.addMinter(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should not allow add minter from non governance address', async () => {
      await expect(balle.connect(test).addMinter(test.address)).to.be.revertedWith('!governance')
    })

    it('should allow add minter from governance address', async () => {
      await expect(balle.addMinter(test.address)).to.emit(balle, 'AddMinter').withArgs(test.address)
    })

    it('should not allow remove minter from non governance address', async () => {
      await expect(balle.connect(test).removeMinter(test2.address)).to.be.revertedWith('!governance')
    })

    it('should not allow zero address to be removed as minter', async () => {
      await expect(balle.removeMinter(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should allow mint tokens', async () => {
      await expect(balle.connect(test).mint(test2.address, expandTo18Decimals(100)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test2.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should allow to remove minter', async () => {
      await expect(balle.removeMinter(test.address)).to.emit(balle, 'RemoveMinter').withArgs(test.address)
    })

    it('should not allow mint tokens after minter removed', async () => {
      await expect(balle.connect(test).mint(test2.address, expandTo18Decimals(100))).to.be.revertedWith('!minter')
    })
  })

  describe('Token basic operations and cap', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
    })

    it('should allow minting to an address', async () => {
      await expect(balle.mint(test.address, expandTo18Decimals(500)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
    })

    it('should allow transfer to another address', async () => {
      await expect(balle.connect(test).transfer(test2.address, expandTo18Decimals(100)))
        .to.emit(balle, 'Transfer')
        .withArgs(test.address, test2.address, expandTo18Decimals(100))
      expect(await balle.balanceOf(test2.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should allow more minting', async () => {
      await expect(balle.mint(test.address, expandTo18Decimals(400)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, expandTo18Decimals(400))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(800))
    })

    it('should not allow minting if cap exceeded', async () => {
      await expect(balle.mint(test.address, expandTo18Decimals(39101))).to.be.revertedWith('!cap')
    })

    it('should allow minting to max cap', async () => {
      const cap = await balle.cap()
      const supply = await balle.totalSupply()
      await expect(balle.mint(test.address, cap.sub(supply)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, expandTo18Decimals(39100))
    })
  })

  describe('Token special functions', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      tokenA = await ethers.getContract('TokenA')
    })

    it('should only allow governance address recover stuck tokens', async () => {
      await expect(
        balle.connect(test).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), test.address),
      ).to.be.revertedWith('!governance')
    })

    it('should fail if send to address zero', async () => {
      await expect(balle.inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), ZERO_ADDRESS)).to.be.revertedWith(
        'zero address',
      )
    })

    it('should allow recover stuck tokens', async () => {
      // setup
      await expect(tokenA.mint(balle.address, expandTo18Decimals(50)))
        .to.emit(tokenA, 'Transfer')
        .withArgs(ZERO_ADDRESS, balle.address, expandTo18Decimals(50))
      expect(await tokenA.balanceOf(balle.address)).to.be.equal(expandTo18Decimals(50))

      await expect(balle.inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), test.address))
        .to.emit(tokenA, 'Transfer')
        .withArgs(balle.address, test.address, expandTo18Decimals(50))
      expect(await tokenA.balanceOf(balle.address)).to.be.equal(0)
      expect(await tokenA.balanceOf(test.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
