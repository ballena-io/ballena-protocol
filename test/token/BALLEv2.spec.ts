import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { expect } from '../shared/expect'

describe('BALLEv2 Token', () => {
  let Balle: ContractFactory
  let balle: Contract
  let ownerAccount: SignerWithAddress, testAccount: SignerWithAddress, test2Account: SignerWithAddress

  async function deployContracts() {
    balle = await Balle.deploy('BALLEv2', 'BALLE', 1000)
    await balle.deployed()
  }

  before('Load contract factory', async () => {
    Balle = await ethers.getContractFactory('BALLEv2')
    ;[ownerAccount, testAccount, test2Account] = await ethers.getSigners()
  })

  describe('Test constructor', () => {
    it('should fail on invalid parameters', async () => {
      await expect(Balle.deploy('BALLEv2', 'BALLE', 0)).to.be.revertedWith('BALLE: cap is 0')
    })
  })

  describe('Token governance', () => {
    before('Deploy BALLEv2 contract', async () => {
      await deployContracts()
    })

    it('should set initial governance to contract creator', async () => {
      expect(await balle.governance()).to.be.equal(ownerAccount.address)
    })

    it('should not allow non governance address to set new governance', async () => {
      await expect(balle.connect(testAccount).setGovernance(test2Account.address)).to.be.revertedWith('!governance')
    })

    it('should allow governance to set new governance', async () => {
      await expect(balle.setGovernance(testAccount.address))
        .to.emit(balle, 'SetGovernance')
        .withArgs(testAccount.address)
    })

    it('should allow zero address to be set as governance', async () => {
      await expect(balle.connect(testAccount).setGovernance('0x0000000000000000000000000000000000000000'))
        .to.emit(balle, 'SetGovernance')
        .withArgs('0x0000000000000000000000000000000000000000')
    })
  })

  describe('Token minting', () => {
    before('Deploy BALLEv2 contract', async () => {
      await deployContracts()
    })

    it('should not allow mint tokens if no minter set', async () => {
      await expect(balle.mint(testAccount.address, 500)).to.be.revertedWith('!minter')
    })

    it('should not allow add minter for non governance address', async () => {
      await expect(balle.connect(testAccount).addMinter(testAccount.address)).to.be.revertedWith('!governance')
    })

    it('should allow add minter for governance address (creator)', async () => {
      await expect(balle.addMinter(ownerAccount.address)).to.emit(balle, 'AddMinter').withArgs(ownerAccount.address)
    })

    it('should not allow remove minter for non governance address', async () => {
      await expect(balle.connect(testAccount).removeMinter(ownerAccount.address)).to.be.revertedWith('!governance')
    })

    it('should allow mint tokens', async () => {
      await expect(balle.mint(testAccount.address, 100))
        .to.emit(balle, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000000', testAccount.address, 100)
    })

    it('should allow to remove minter', async () => {
      await expect(balle.removeMinter(ownerAccount.address))
        .to.emit(balle, 'RemoveMinter')
        .withArgs(ownerAccount.address)
    })

    it('should not allow mint tokens after minter removed', async () => {
      await expect(balle.mint(testAccount.address, 100)).to.be.revertedWith('!minter')
    })
  })

  describe('Token basic operations and cap', () => {
    before('Deploy BALLEv2 contract', async () => {
      await deployContracts()
    })

    it('should allow minting to an address', async () => {
      await expect(balle.addMinter(ownerAccount.address)).to.emit(balle, 'AddMinter').withArgs(ownerAccount.address)
      await expect(balle.mint(testAccount.address, 500))
        .to.emit(balle, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000000', testAccount.address, 500)
    })

    it('should allow transfer to another address', async () => {
      await expect(balle.connect(testAccount).transfer(test2Account.address, 100))
        .to.emit(balle, 'Transfer')
        .withArgs(testAccount.address, test2Account.address, 100)
    })

    it('should allow more minting', async () => {
      await expect(balle.mint(testAccount.address, 400))
        .to.emit(balle, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000000', testAccount.address, 400)
    })

    it('should not allow minting if cap exceeded', async () => {
      await expect(balle.mint(testAccount.address, 400)).to.be.revertedWith('!cap')
    })

    it('should allow minting to max cap', async () => {
      await expect(balle.mint(testAccount.address, 100))
        .to.emit(balle, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000000', testAccount.address, 100)
    })
  })
})
