import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { expect } from '../shared/expect'
import { ZERO_ADDRESS, MaxUint128 } from '../../src/utils/constants'
import { expandTo18Decimals } from '../shared/utils'

describe('BALLE Migration', () => {
  let Balle: ContractFactory
  let balle: Contract
  let BalleV2: ContractFactory
  let balleV2: Contract
  let BalleMigration: ContractFactory
  let balleMigration: Contract
  let ownerAccount: SignerWithAddress, testAccount: SignerWithAddress

  async function deployMockContracts() {
    balle = await Balle.deploy('ballena.io', 'BALLE')
    await balle.deployed()
    balleV2 = await BalleV2.deploy('BALLEv2', 'BALLE', expandTo18Decimals(1000))
    await balleV2.deployed()
  }

  async function deployContracts() {
    balleMigration = await BalleMigration.deploy(balle.address, balleV2.address)
    await balleMigration.deployed()
  }

  before('Load contracts factory', async () => {
    Balle = await ethers.getContractFactory('BALLE')
    BalleV2 = await ethers.getContractFactory('BALLEv2')
    BalleMigration = await ethers.getContractFactory('BalleMigration')
    ;[ownerAccount, testAccount] = await ethers.getSigners()
  })

  describe('Test constructor', () => {
    before('Deploy mock contracts', async () => {
      await deployMockContracts()
    })

    it('should fail on zero BALLE address', async () => {
      await expect(BalleMigration.deploy(ZERO_ADDRESS, balleV2.address)).to.be.revertedWith('BALLE address not valid')
    })

    it('should fail on zero BALLEv2 address', async () => {
      await expect(BalleMigration.deploy(balle.address, ZERO_ADDRESS)).to.be.revertedWith('BALLEv2 address not valid')
    })

    it('should fail on same BALLE and BALLEv2 address', async () => {
      await expect(BalleMigration.deploy(balleV2.address, balleV2.address)).to.be.revertedWith('Invalid address')
    })

    it('should create contract with valid params', async () => {
      await BalleMigration.deploy(balle.address, balleV2.address)
    })
  })

  describe('Test migration', () => {
    before('Deploy contracts', async () => {
      await deployMockContracts()
      await deployContracts()
    })

    it('should fail migrate if not allowance', async () => {
      // setup BALLE balance
      await balle.addMinter(ownerAccount.address)
      await expect(balle.mint(testAccount.address, expandTo18Decimals(500)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, testAccount.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(testAccount.address)).to.be.equal(expandTo18Decimals(500))

      await expect(balleMigration.connect(testAccount).migrate()).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance',
      )
    })

    it('should migrate tokens', async () => {
      // BALLE balance already set, verify.
      expect(await balle.balanceOf(testAccount.address)).to.be.equal(expandTo18Decimals(500))
      // approve BALLE transfer to migration contract
      balle.connect(testAccount).approve(balleMigration.address, MaxUint128)

      // set migration contract as BALLEv2 minter
      await balleV2.addMinter(balleMigration.address)

      await expect(balleMigration.connect(testAccount).migrate())
        .to.emit(balleMigration, 'Migrate')
        .withArgs(testAccount.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(testAccount.address)).to.be.equal(0)
      expect(await balleV2.balanceOf(testAccount.address)).to.be.equal(expandTo18Decimals(500))
    })
  })
})
