import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { getBlockNumber, mineBlock } from '../shared/hardhatNode'
import { ZERO_ADDRESS, MaxUint256 } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('BALLE Migration', () => {
  let balle: Contract
  let balleV2: Contract
  let BalleMigration: ContractFactory
  let balleMigration: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLE')
    balleV2 = await ethers.getContract('BALLEv2')

    BalleMigration = await ethers.getContractFactory('BalleMigration')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
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
      await deployments.fixture()
      balle = await ethers.getContract('BALLE')
      balleV2 = await ethers.getContract('BALLEv2')
      balleMigration = await ethers.getContract('BalleMigration')
    })

    it('should revert if not amount to migrate', async () => {
      await expect(balleMigration.connect(test).migrate()).to.be.revertedWith('!amount')
    })

    it('should fail migrate if not allowance', async () => {
      // setup BALLE balance
      await balle.addMinter(deployer.address)
      await expect(balle.mint(test.address, expandTo18Decimals(500)))
        .to.emit(balle, 'Transfer')
        .withArgs(ZERO_ADDRESS, test.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))

      await expect(balleMigration.connect(test).migrate()).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance',
      )
    })

    it('should migrate tokens', async () => {
      // BALLE balance already set, verify.
      expect(await balle.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve BALLE transfer to migration contract
      balle.connect(test).approve(balleMigration.address, MaxUint256)

      // set migration contract as BALLEv2 minter
      await balleV2.addMinter(balleMigration.address)

      await expect(balleMigration.connect(test).migrate())
        .to.emit(balleMigration, 'Migrate')
        .withArgs(test.address, expandTo18Decimals(500))
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
      expect(await balleV2.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
    })

    it.skip('should revert if last allowed block passed', async () => {
      const currentBlock = await getBlockNumber()
      let counter = 0

      while (currentBlock + counter < 6412000) {
        counter++
        mineBlock()
      }
      await expect(balleMigration.connect(test).migrate()).to.be.revertedWith('too late')
    })
  })
})
