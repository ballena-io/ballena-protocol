import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { expect } from '../shared/expect'
import { MaxUint256, ZERO_ADDRESS } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('StratBalleLpV1', () => {
  let tokenA: Contract
  let testLP: Contract
  let StratBalleLpV1: ContractFactory
  let stratBalleLpV1: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()

    StratBalleLpV1 = await ethers.getContractFactory('StratBalleLpV1')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    before('Prepare data', async () => {
      testLP = await ethers.getContract('TestLP')
    })

    it('should create contract with correct params', async () => {
      await StratBalleLpV1.deploy(testLP.address, deployer.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
    })

    it('should revert if not owner address calls deposit()', async () => {
      await expect(stratBalleLpV1.connect(test).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls withdraw()', async () => {
      await expect(stratBalleLpV1.connect(test).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not governance address calls setGovernance', async () => {
      await expect(stratBalleLpV1.connect(test).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('!governance')
    })

    it('should revert if not governance address calls inCaseTokensGetStuck', async () => {
      await expect(stratBalleLpV1.connect(test).inCaseTokensGetStuck(ZERO_ADDRESS, 0, ZERO_ADDRESS)).to.be.revertedWith(
        '!governance',
      )
    })

    it('should revert if not owner address calls pause()', async () => {
      await expect(stratBalleLpV1.connect(test).pause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls unpause()', async () => {
      await expect(stratBalleLpV1.connect(test).unpause()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls panic()', async () => {
      await expect(stratBalleLpV1.connect(test).panic()).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if not owner address calls retire()', async () => {
      await expect(stratBalleLpV1.connect(test).retire()).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })

  describe('Test setGovernance()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
    })

    it('should revert if set zero address', async () => {
      await expect(stratBalleLpV1.connect(deployer).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('zero address')
    })

    it('should set new governance', async () => {
      await expect(stratBalleLpV1.connect(deployer).setGovernance(test.address))
        .to.emit(stratBalleLpV1, 'SetGovernance')
        .withArgs(test.address)
      expect(await stratBalleLpV1.governance()).to.be.equal(test.address)
    })
  })

  describe('Test pause(), unpause(), panic() and retire()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
    })

    it('should revert unpause when not paused', async () => {
      await expect(stratBalleLpV1.connect(deployer).unpause()).to.be.revertedWith('!paused')
    })

    it('should pause strategy', async () => {
      await stratBalleLpV1.connect(deployer).pause()
      expect(await stratBalleLpV1.paused()).to.be.equal(true)
    })

    it('should revert pause when already paused', async () => {
      await expect(stratBalleLpV1.connect(deployer).pause()).to.be.revertedWith('paused')
    })

    it('should revert panic when paused', async () => {
      await expect(stratBalleLpV1.connect(deployer).panic()).to.be.revertedWith('paused')
    })

    it('should revert deposit when paused', async () => {
      await expect(stratBalleLpV1.connect(deployer).deposit(deployer.address, 0)).to.be.revertedWith('paused')
    })

    it('should unpause strategy', async () => {
      await stratBalleLpV1.connect(deployer).unpause()
      expect(await stratBalleLpV1.paused()).to.be.equal(false)
    })

    it('should panic strategy', async () => {
      await stratBalleLpV1.connect(deployer).panic()
      expect(await stratBalleLpV1.paused()).to.be.equal(true)
    })

    it('should unpause strategy', async () => {
      await stratBalleLpV1.connect(deployer).unpause()
      expect(await stratBalleLpV1.paused()).to.be.equal(false)
    })

    it('should retire strategy', async () => {
      await stratBalleLpV1.connect(deployer).retire()
      expect(await stratBalleLpV1.paused()).to.be.equal(true)
    })
  })

  describe('Test deposit()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
    })

    it('should revert deposit if not user address', async () => {
      await expect(stratBalleLpV1.connect(deployer).deposit(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should deposit amount', async () => {
      // setup TestLP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TestLP transfer to strategy contract
      testLP.connect(deployer).approve(stratBalleLpV1.address, MaxUint256)

      // use callStatic to check return value of solidity function
      expect(
        await stratBalleLpV1.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal(expandTo18Decimals(100))
      // make deposit
      await stratBalleLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(100))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(100))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(100))
    })

    it('should deposit second amount', async () => {
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      expect(
        await stratBalleLpV1.connect(deployer).callStatic.deposit(deployer.address, expandTo18Decimals(100)),
      ).to.be.equal(expandTo18Decimals(100))
      // make deposit
      await stratBalleLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(200))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(200))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(200))
    })

    it('should retire strategy', async () => {
      await stratBalleLpV1.connect(deployer).retire()
      // check values
      expect(await stratBalleLpV1.paused()).to.be.equal(true)
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(200))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(200))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(200))
    })
  })

  describe('Test withdraw()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
    })

    it('should revert withdraw if no user address', async () => {
      await expect(stratBalleLpV1.connect(deployer).withdraw(ZERO_ADDRESS, expandTo18Decimals(0))).to.be.revertedWith(
        '!user',
      )
    })

    it('should revert withdraw if not amount', async () => {
      await expect(
        stratBalleLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(0)),
      ).to.be.revertedWith('!amount')
    })

    it('should withdraw amount', async () => {
      // setup TestLP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      // approve TestLP transfer to strategy contract
      testLP.connect(deployer).approve(stratBalleLpV1.address, MaxUint256)
      // make deposit
      await stratBalleLpV1.connect(deployer).deposit(deployer.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(500))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratBalleLpV1
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(100))
      expect(shares).to.be.equal(expandTo18Decimals(100))
      expect(deposit).to.be.equal(expandTo18Decimals(100))
      // make withdraw
      await stratBalleLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(400))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(400))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(400))
    })

    it('should make second withdraw', async () => {
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratBalleLpV1
        .connect(deployer)
        .callStatic.withdraw(test.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratBalleLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(350))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(350))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(350))
    })

    it('should make third withdraw', async () => {
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(350))

      // use callStatic to check return value of solidity function
      const [shares, deposit] = await stratBalleLpV1
        .connect(deployer)
        .callStatic.withdraw(deployer.address, expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await stratBalleLpV1.connect(deployer).withdraw(deployer.address, expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(300))
      expect(await stratBalleLpV1.depositTotal()).to.be.equal(expandTo18Decimals(300))
      expect(await stratBalleLpV1.sharesTotal()).to.be.equal(expandTo18Decimals(300))
    })
  })

  describe('Test inCaseTokensGetStuck()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      tokenA = await ethers.getContract('TokenA')
      stratBalleLpV1 = await ethers.getContract('StratBalleLpV1')
      // setup TokenA balance
      await tokenA.mint(stratBalleLpV1.address, expandTo18Decimals(100))
      expect(await tokenA.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should revert if no to address', async () => {
      await expect(
        stratBalleLpV1.connect(deployer).inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(0), ZERO_ADDRESS),
      ).to.be.revertedWith('zero address')
    })

    it('should revert if try to transfer depositToken', async () => {
      await expect(
        stratBalleLpV1.connect(deployer).inCaseTokensGetStuck(testLP.address, expandTo18Decimals(50), deployer.address),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer tokens', async () => {
      await stratBalleLpV1
        .connect(deployer)
        .inCaseTokensGetStuck(tokenA.address, expandTo18Decimals(50), deployer.address)
      expect(await tokenA.balanceOf(stratBalleLpV1.address)).to.be.equal(expandTo18Decimals(50))
      expect(await tokenA.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(50))
    })
  })
})
