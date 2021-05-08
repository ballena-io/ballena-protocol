import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { MaxUint256, ZERO_ADDRESS } from '../../src/utils/constants'
import { mineBlock } from '../shared/hardhatNode'
import { expandTo18Decimals } from '../../src/utils'

describe('StratPancakeLpV1', () => {
  let testLP: Contract
  let router: Contract
  let masterChef: Contract
  let rewardPot: Contract
  let treasury: Contract
  let balle: Contract
  let StratPancakeLpV1: ContractFactory
  let stratPancakeLpV1: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress
  let addresses: string[]
  let cakeToBallePath: string[]
  let cakeToToken0Path: string[]
  let cakeToToken1Path: string[]

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()

    StratPancakeLpV1 = await ethers.getContractFactory('StratPancakeLpV1')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Prepare data', async () => {
      addresses = [
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
        deployer.address,
      ]
      cakeToBallePath = [deployer.address, deployer.address]
      cakeToToken0Path = [deployer.address, deployer.address]
      cakeToToken1Path = [deployer.address, deployer.address]
    })

    it('should revert if pid == 0', async () => {
      await expect(
        StratPancakeLpV1.deploy(addresses, 0, cakeToBallePath, cakeToToken0Path, cakeToToken1Path),
      ).to.be.revertedWith('!pid')
    })

    it('should create contract with correct params', async () => {
      await StratPancakeLpV1.deploy(addresses, 1, cakeToBallePath, cakeToToken0Path, cakeToToken1Path)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratPancakeLpV1 = await ethers.getContract('StratPancakeLpV1')
    })

    it('should revert if not owner address calls deposit()', async () => {
      await expect(stratPancakeLpV1.connect(test).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls withdraw()', async () => {
      await expect(stratPancakeLpV1.connect(test).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not harvester address calls harvest()', async () => {
      await expect(stratPancakeLpV1.connect(test).harvest()).to.be.revertedWith('!governance && !harvester')
    })

    it('should revert if not governance address calls setSettings()', async () => {
      await expect(stratPancakeLpV1.connect(test).setSettings(0, 0, 0, 0, 0, 0)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls setGovernance', async () => {
      await expect(stratPancakeLpV1.connect(test).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls addHarvester', async () => {
      await expect(stratPancakeLpV1.connect(test).addHarvester(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls removeHarvester', async () => {
      await expect(stratPancakeLpV1.connect(test).removeHarvester(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls inCaseTokensGetStuck', async () => {
      await expect(
        stratPancakeLpV1.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, 0, ZERO_ADDRESS),
      ).to.be.revertedWith('!governance')
    })

    it('should revert if not owner address calls upgradeTo()', async () => {
      await expect(stratPancakeLpV1.connect(test).upgradeTo(ZERO_ADDRESS)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls upgradeFrom()', async () => {
      await expect(stratPancakeLpV1.connect(test).upgradeFrom(ZERO_ADDRESS, 0, 0, 0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls pause()', async () => {
      await expect(stratPancakeLpV1.connect(test).pause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls unpause()', async () => {
      await expect(stratPancakeLpV1.connect(test).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls panic()', async () => {
      await expect(stratPancakeLpV1.connect(test).panic()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls retire()', async () => {
      await expect(stratPancakeLpV1.connect(test).retire()).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test deposit()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV1 = await ethers.getContract('StratPancakeLpV1')
    })

    it('should revert deposit if not user address', async () => {
      await expect(stratPancakeLpV1.connect(deployer).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should deposit amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to strategy contract
      testLP.connect(deployer).approve(stratPancakeLpV1.address, MaxUint256)

      // use callStatic to check return value of solidity function
      expect(
        await stratPancakeLpV1.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal(expandTo18Decimals(100))
      // make deposit
      await stratPancakeLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(100))
    })

    it('should deposit second amount', async () => {
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      expect(
        await stratPancakeLpV1.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal('99900000000000000000')
      // make deposit
      await stratPancakeLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal('199900000000000000000')
    })
  })

  describe('Test withdraw()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV1 = await ethers.getContract('StratPancakeLpV1')
    })

    it('should revert withdraw if no user address', async () => {
      await expect(stratPancakeLpV1.connect(deployer).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should revert withdraw if not amount', async () => {
      await expect(
        stratPancakeLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(0)),
      ).to.be.revertedWith('!amount')
    })

    it('should withdraw amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to strategy contract
      testLP.connect(deployer).approve(stratPancakeLpV1.address, MaxUint256)
      // make deposit
      await stratPancakeLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(500))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV1
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(100))
      expect(shares).to.be.equal(expandTo18Decimals(100))
      expect(deposit).to.be.equal(expandTo18Decimals(100))
      // make withdraw
      await stratPancakeLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(400))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(400))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(400))
    })

    it('should make second withdraw', async () => {
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV1
        .connect(deployer)
        .callStatic.withdraw(test.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratPancakeLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(350))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(350))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(350))
    })

    it('should make third withdraw', async () => {
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(350))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV1
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratPancakeLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(300))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(300))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(300))
    })
  })

  describe('Test harvest()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV1 = await ethers.getContract('StratPancakeLpV1')
      rewardPot = await ethers.getContract('MockRewardPot')
      treasury = await ethers.getContract('MockTreasury')
      // Our special mockRouter needs to mint BALLE
      router = await ethers.getContract('MockRouter')
      balle = await ethers.getContract('BALLEv2')
      await balle.addMinter(router.address)
    })

    it('should harvest', async () => {
      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to TestStrategy contract
      testLP.connect(deployer).approve(stratPancakeLpV1.address, MaxUint256)
      // make deposit
      await stratPancakeLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(500))
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal(expandTo18Decimals(500))
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(500))

      // Wait one more block, to earn 2 CAKE
      mineBlock()

      // make harvest
      await stratPancakeLpV1.connect(deployer).harvest()

      // Check values
      // We earned 2 CAKE, so 0.6 BALLE (change is 1:1 on test) to reward holders
      expect(await balle.balanceOf(rewardPot.address)).to.be.equal('60000000000000000')
      // We earned 2 CAKE, so 0.2 BALLE (change is 1:1 on test) to treasury
      expect(await balle.balanceOf(treasury.address)).to.be.equal('20000000000000000')
      // We earned 2 CAKE, so 0.96 liquidity increase in test
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal('500960000000000000000')
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal('500960000000000000000')
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should harvest after some more time', async () => {
      // Wait some more blocks, to earn 4 CAKE
      mineBlock()
      mineBlock()
      mineBlock()

      // make harvest
      await stratPancakeLpV1.connect(deployer).harvest()

      // Check values
      // We earned 2 CAKE, so 0.6 BALLE (change is 1:1 on test) to reward holders
      expect(await balle.balanceOf(rewardPot.address)).to.be.equal('180000000000000000')
      // We earned 2 CAKE, so 0.2 BALLE (change is 1:1 on test) to treasury
      expect(await balle.balanceOf(treasury.address)).to.be.equal('60000000000000000')
      // We earned 2 CAKE, so 0.96 liquidity increase in test
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal('502880000000000000000')
      expect(await stratPancakeLpV1.depositTotal()).to.be.equal('502880000000000000000')
      expect(await stratPancakeLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })
  })
})
