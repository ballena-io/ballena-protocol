import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { MaxUint256, ZERO_ADDRESS } from '../../src/utils/constants'
import { mineBlock } from '../shared/hardhatNode'
import { expandTo18Decimals } from '../../src/utils'

describe('StratPancakeLpV3', () => {
  let testLP: Contract
  let cake: Contract
  let tokenA: Contract
  let router: Contract
  let masterChef: Contract
  let rewardPot: Contract
  let treasury: Contract
  let balle: Contract
  let StratPancakeLpV3: ContractFactory
  let stratPancakeLpV3: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress
  let addresses: string[]
  let cakeToBallePath: string[]
  let cakeToToken0Path: string[]
  let cakeToToken1Path: string[]

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()

    StratPancakeLpV3 = await ethers.getContractFactory('StratPancakeLpV3')
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
        StratPancakeLpV3.deploy(addresses, 0, cakeToBallePath, cakeToToken0Path, cakeToToken1Path),
      ).to.be.revertedWith('!pid')
    })

    it('should create contract with correct params', async () => {
      await StratPancakeLpV3.deploy(addresses, 1, cakeToBallePath, cakeToToken0Path, cakeToToken1Path)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert if not owner address calls deposit()', async () => {
      await expect(stratPancakeLpV3.connect(test).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls withdraw()', async () => {
      await expect(stratPancakeLpV3.connect(test).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not harvester address calls harvest()', async () => {
      await expect(stratPancakeLpV3.connect(test).harvest()).to.be.revertedWith('!harvester')
    })

    it('should revert if not operations address calls setSettings()', async () => {
      await expect(stratPancakeLpV3.connect(test).setSettings(0, 0, 0, 0, 0)).to.be.revertedWith('!operations')
    })

    it('should revert if not governance address calls setGovernance', async () => {
      await expect(stratPancakeLpV3.connect(test).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls setOperations', async () => {
      await expect(stratPancakeLpV3.connect(test).setOperations(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls setRewards', async () => {
      await expect(stratPancakeLpV3.connect(test).setRewards(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls setTreasury', async () => {
      await expect(stratPancakeLpV3.connect(test).setTreasury(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not operations address calls addHarvester', async () => {
      await expect(stratPancakeLpV3.connect(test).addHarvester(ZERO_ADDRESS)).to.be.revertedWith('!operations')
    })

    it('should revert if not operations address calls removeHarvester', async () => {
      await expect(stratPancakeLpV3.connect(test).removeHarvester(ZERO_ADDRESS)).to.be.revertedWith('!operations')
    })

    it('should revert if not governance address calls inCaseTokensGetStuck', async () => {
      await expect(
        stratPancakeLpV3.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, 0, ZERO_ADDRESS),
      ).to.be.revertedWith('!governance')
    })

    it('should revert if not owner address calls pause()', async () => {
      await expect(stratPancakeLpV3.connect(test).pause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls unpause()', async () => {
      await expect(stratPancakeLpV3.connect(test).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls panic()', async () => {
      await expect(stratPancakeLpV3.connect(test).panic()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls retire()', async () => {
      await expect(stratPancakeLpV3.connect(test).retire()).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setRewards(), setTreasury(), setOperations() and setGovernance()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert if set zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setRewards(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new rewards address', async () => {
      await stratPancakeLpV3.connect(deployer).setRewards(test.address)
      expect(await stratPancakeLpV3.rewards()).to.be.equal(test.address)
    })

    it('should revert if set zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setTreasury(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new treasury address', async () => {
      await stratPancakeLpV3.connect(deployer).setTreasury(test.address)
      expect(await stratPancakeLpV3.treasury()).to.be.equal(test.address)
    })

    it('should revert if set zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setOperations(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new treasury address', async () => {
      await stratPancakeLpV3.connect(deployer).setOperations(test.address)
      expect(await stratPancakeLpV3.operations()).to.be.equal(test.address)
    })

    it('should revert if set zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new governance', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setGovernance(test.address))
        .to.emit(stratPancakeLpV3, 'SetGovernance')
        .withArgs(test.address)
      expect(await stratPancakeLpV3.governance()).to.be.equal(test.address)
    })
  })

  describe('Test addHarvester() & removeHarvester()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert if add zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).addHarvester(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should revert if remove zero address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).removeHarvester(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should add new harvester', async () => {
      await expect(stratPancakeLpV3.connect(deployer).addHarvester(test.address))
      expect(await stratPancakeLpV3.harvesters(test.address)).to.be.equal(true)
    })

    it('should remove harvester', async () => {
      await expect(stratPancakeLpV3.connect(deployer).removeHarvester(test.address))
      expect(await stratPancakeLpV3.harvesters(test.address)).to.be.equal(false)
      await expect(stratPancakeLpV3.connect(test).harvest()).to.be.revertedWith('!harvester')
    })
  })

  describe('Test pause(), unpause(), panic() and retire()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert unpause when not paused', async () => {
      await expect(stratPancakeLpV3.connect(deployer).unpause()).to.be.revertedWith('!paused')
    })

    it('should pause strategy', async () => {
      await stratPancakeLpV3.connect(deployer).pause()
      expect(await stratPancakeLpV3.paused()).to.be.equal(true)
    })

    it('should revert pause when already paused', async () => {
      await expect(stratPancakeLpV3.connect(deployer).pause()).to.be.revertedWith('paused')
    })

    it('should revert panic when paused', async () => {
      await expect(stratPancakeLpV3.connect(deployer).panic()).to.be.revertedWith('paused')
    })

    it('should revert harvest when paused', async () => {
      await expect(stratPancakeLpV3.connect(deployer).harvest()).to.be.revertedWith('paused')
    })

    it('should revert deposit when paused', async () => {
      await expect(stratPancakeLpV3.connect(deployer).deposit(deployer.address, 0)).to.be.revertedWith('paused')
    })

    it('should unpause strategy', async () => {
      await stratPancakeLpV3.connect(deployer).unpause()
      expect(await stratPancakeLpV3.paused()).to.be.equal(false)
    })

    it('should panic strategy', async () => {
      await stratPancakeLpV3.connect(deployer).panic()
      expect(await stratPancakeLpV3.paused()).to.be.equal(true)
    })

    it('should unpause strategy', async () => {
      await stratPancakeLpV3.connect(deployer).unpause()
      expect(await stratPancakeLpV3.paused()).to.be.equal(false)
    })

    it('should retire strategy', async () => {
      await stratPancakeLpV3.connect(deployer).retire()
      expect(await stratPancakeLpV3.paused()).to.be.equal(true)
    })
  })

  describe('Test deposit()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert deposit if not user address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should deposit amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to strategy contract
      testLP.connect(deployer).approve(stratPancakeLpV3.address, MaxUint256)

      // use callStatic to check return value of solidity function
      expect(
        await stratPancakeLpV3.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal(expandTo18Decimals(100))
      // make deposit
      await stratPancakeLpV3.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(100))
    })

    it('should deposit second amount', async () => {
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      expect(
        await stratPancakeLpV3.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal('99900000000000000000')
      // make deposit
      await stratPancakeLpV3.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal('199900000000000000000')
    })

    it('should retire strategy', async () => {
      await stratPancakeLpV3.connect(deployer).retire()
      // check values
      expect(await stratPancakeLpV3.paused()).to.be.equal(true)
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(0)
      expect(await testLP.balanceOf(stratPancakeLpV3.address)).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(200))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal('199900000000000000000')
    })
  })

  describe('Test withdraw()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
    })

    it('should revert withdraw if no user address', async () => {
      await expect(stratPancakeLpV3.connect(deployer).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should revert withdraw if not amount', async () => {
      await expect(
        stratPancakeLpV3.connect(deployer).withdraw(deployer.address, expandTo18Decimals(0)),
      ).to.be.revertedWith('!amount')
    })

    it('should withdraw amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to strategy contract
      testLP.connect(deployer).approve(stratPancakeLpV3.address, MaxUint256)
      // make deposit
      await stratPancakeLpV3.connect(deployer).deposit(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(500))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV3
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(100))
      expect(shares).to.be.equal(expandTo18Decimals(100))
      expect(deposit).to.be.equal(expandTo18Decimals(100))
      // make withdraw
      await stratPancakeLpV3.connect(deployer).withdraw(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(400))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(400))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(400))
    })

    it('should make second withdraw', async () => {
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV3
        .connect(deployer)
        .callStatic.withdraw(test.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratPancakeLpV3.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(350))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(350))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(350))
    })

    it('should make third withdraw', async () => {
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(350))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratPancakeLpV3
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratPancakeLpV3.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(300))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(300))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(300))
    })
  })

  describe('Test harvest()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      cake = await ethers.getContract('CAKE')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
      rewardPot = await ethers.getContract('BalleRewardFund')
      treasury = await ethers.getContract('BalleTreasury')
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
      testLP.connect(deployer).approve(stratPancakeLpV3.address, MaxUint256)
      // make deposit
      await stratPancakeLpV3.connect(deployer).deposit(deployer.address, expandTo18Decimals(500))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(500))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(500))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(500))

      // Wait 9 more block
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()

      // check pending CAKE
      expect(await stratPancakeLpV3.pendingEarnedToken()).to.be.equal(expandTo18Decimals(9))

      // make harvest
      await expect(stratPancakeLpV3.connect(deployer).harvest())
        .to.emit(stratPancakeLpV3, 'Harvest')
        .withArgs(expandTo18Decimals(10))
        .emit(stratPancakeLpV3, 'DistributeFees')
        .withArgs('300000000000000000', '100000000000000000')

      // Check values
      expect(await cake.balanceOf(stratPancakeLpV3.address)).to.be.equal(0)
      // We earned 10 CAKE, so 0.3 BALLE (change is 1:1 on test) to reward holders
      expect(await balle.balanceOf(rewardPot.address)).to.be.equal('300000000000000000')
      // We earned 10 CAKE, so 0.1 BALLE (change is 1:1 on test) to treasury
      expect(await balle.balanceOf(treasury.address)).to.be.equal('100000000000000000')
      // We earned 10 CAKE, so 4.8 liquidity increase in test
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal('504800000000000000000')
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal('504800000000000000000')
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should harvest after some more time', async () => {
      // Wait some more blocks, to earn 15 CAKE
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()
      mineBlock()

      // check pending CAKE
      expect(await stratPancakeLpV3.pendingEarnedToken()).to.be.equal(expandTo18Decimals(14))

      // make harvest
      await expect(stratPancakeLpV3.connect(deployer).harvest())
        .to.emit(stratPancakeLpV3, 'Harvest')
        .withArgs(expandTo18Decimals(15))
        .emit(stratPancakeLpV3, 'DistributeFees')
        .withArgs('450000000000000000', '150000000000000000')

      // Check values
      expect(await cake.balanceOf(stratPancakeLpV3.address)).to.be.equal(0)
      // We earned 15 CAKE, so 0.45 BALLE (change is 1:1 on test) to reward holders
      expect(await balle.balanceOf(rewardPot.address)).to.be.equal('750000000000000000')
      // We earned 15 CAKE, so 0.15 BALLE (change is 1:1 on test) to treasury
      expect(await balle.balanceOf(treasury.address)).to.be.equal('250000000000000000')
      // We earned 15 CAKE, so 7.2 liquidity increase in test
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal('512000000000000000000')
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal('512000000000000000000')
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })
  })

  describe('Test setSettings()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      cake = await ethers.getContract('CAKE')
      masterChef = await ethers.getContract('MockMasterChef')
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
      rewardPot = await ethers.getContract('BalleRewardFund')
      treasury = await ethers.getContract('BalleTreasury')
      // Our special mockRouter needs to mint BALLE
      router = await ethers.getContract('MockRouter')
      balle = await ethers.getContract('BALLEv2')
      await balle.addMinter(router.address)

      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to strategy contract
      testLP.connect(deployer).approve(stratPancakeLpV3.address, MaxUint256)
      // make deposit
      await stratPancakeLpV3.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(masterChef.address)).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV3.depositTotal()).to.be.equal(expandTo18Decimals(100))
      expect(await stratPancakeLpV3.sharesTotal()).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if entranceFee < ENTRANCE_FEE_LL', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(9900, 0, 0, 0, 0)).to.be.revertedWith(
        '!entranceFeeLL',
      )
    })

    it('should revert if entranceFee > ENTRANCE_FEE_MAX', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(10001, 0, 0, 0, 0)).to.be.revertedWith(
        '!entranceFeeMax',
      )
    })

    it('should revert if performanceFee > PERFORMANCE_FEE_UL', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(9950, 808, 0, 0, 0)).to.be.revertedWith(
        '!performanceFeeUL',
      )
    })

    it('should revert if rewardsFeeFactor + treasuryFeeFactor != 1000', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(9950, 800, 600, 600, 0)).to.be.revertedWith(
        '!feeFactor',
      )
    })

    it('should revert if slippage > SLIPPAGE_UL', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(9950, 800, 500, 500, 999)).to.be.revertedWith(
        '!slippageUL',
      )
    })

    it('should set new settings', async () => {
      await expect(stratPancakeLpV3.connect(deployer).setSettings(9950, 800, 500, 500, 900))
        .to.emit(stratPancakeLpV3, 'SetSettings')
        .withArgs(9950, 800, 500, 500, 900)
      expect(await stratPancakeLpV3.entranceFee()).to.be.equal(9950)
      expect(await stratPancakeLpV3.performanceFee()).to.be.equal(800)
      expect(await stratPancakeLpV3.rewardsFeeFactor()).to.be.equal(500)
      expect(await stratPancakeLpV3.treasuryFeeFactor()).to.be.equal(500)
      expect(await stratPancakeLpV3.slippage()).to.be.equal(900)
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      cake = await ethers.getContract('CAKE')
      tokenA = await ethers.getContract('TokenA')
      stratPancakeLpV3 = await ethers.getContract('StratPancakeLpV3')
      // setup TokenA balance
      await tokenA.mint(stratPancakeLpV3.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(stratPancakeLpV3.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no to address', async () => {
      await expect(
        stratPancakeLpV3.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero address')
    })

    it('should revert if try to transfer CAKE', async () => {
      await expect(
        stratPancakeLpV3.connect(deployer).inCaseTokensGetStuck(cake.address, expandTo18Decimals(50), deployer.address),
      ).to.be.revertedWith('!safe')
    })

    it('should revert if try to transfer depositToken', async () => {
      await expect(
        stratPancakeLpV3
          .connect(deployer)
          .inCaseTokensGetStuck(testLP.address, expandTo18Decimals(50), deployer.address),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer tokens', async () => {
      await stratPancakeLpV3
        .connect(deployer)
        .inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), deployer.address)
      expect(await tokenA.balanceOf(stratPancakeLpV3.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
