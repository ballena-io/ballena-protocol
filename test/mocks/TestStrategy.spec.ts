import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from '../shared/expect'
import { MaxUint256 } from '../../src/utils/constants'
import { expandTo18Decimals } from '../../src/utils'

describe('Test Strategy', () => {
  let testLP: Contract
  let TestStrategy: ContractFactory
  let testStrategy: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    testLP = await ethers.getContract('TestLP')

    TestStrategy = await ethers.getContractFactory('TestStrategy')
    ;({ deployer, test } = await ethers.getNamedSigners())
  })

  describe('Test constructor', () => {
    it('should revert if depositToken != wantToken', async () => {
      await expect(TestStrategy.deploy(test.address, testLP.address, deployer.address)).to.be.revertedWith('!token')
    })

    it('should create contract with valid params', async () => {
      await TestStrategy.deploy(test.address, testLP.address, testLP.address)
    })
  })

  describe('Test access protection', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      // will make a local deployment for tests, that way, the owner will be test wallet
      // instead of BalleMaster contract
      TestStrategy = await ethers.getContractFactory('TestStrategy')
      testStrategy = await TestStrategy.deploy(test.address, testLP.address, testLP.address)
      await testStrategy.deployed()
    })

    it('should revert if not gov address calls harvest()', async () => {
      await expect(testStrategy.connect(test).harvest()).to.be.revertedWith('!gov')
    })

    it('should allow gov address call harvest()', async () => {
      expect(testStrategy.connect(deployer).harvest())
    })

    it('should revert if not gov address try to change govAddress', async () => {
      await expect(testStrategy.connect(test).setGov(test.address)).to.be.revertedWith('!gov')
    })

    it('should allow gov address set a new govAddress', async () => {
      expect(testStrategy.connect(deployer).setGov(test.address))
    })

    it('should allow new gov address call harvest()', async () => {
      expect(testStrategy.connect(test).harvest())
    })

    it('should revert if not owner address calls deposit()', async () => {
      await expect(testStrategy.connect(deployer).deposit(expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if not owner address calls withdraw()', async () => {
      await expect(testStrategy.connect(deployer).withdraw(expandTo18Decimals(0))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })
  })

  describe('Test deposit()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      // will make a local deployment for tests, that way, the owner will be test wallet
      // instead of BalleMaster contract
      TestStrategy = await ethers.getContractFactory('TestStrategy')
      testStrategy = await TestStrategy.deploy(test.address, testLP.address, testLP.address)
      await testStrategy.deployed()
    })

    it('should revert deposit if not amount', async () => {
      await expect(testStrategy.connect(test).deposit(expandTo18Decimals(0))).to.be.revertedWith('!amount')
    })

    it('should deposit amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to TestStrategy contract
      testLP.connect(test).approve(testStrategy.address, MaxUint256)

      // use callStatic to check return value of solidity function
      expect(await testStrategy.connect(test).callStatic.deposit(expandTo18Decimals(100))).to.be.equal(
        expandTo18Decimals(100),
      )
      // make deposit
      await testStrategy.connect(test).deposit(expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(100))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(100))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(100))
    })
  })

  describe('Test withdraw()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      // will make a local deployment for tests, that way, the owner will be test wallet
      // instead of BalleMaster contract
      TestStrategy = await ethers.getContractFactory('TestStrategy')
      testStrategy = await TestStrategy.deploy(test.address, testLP.address, testLP.address)
      await testStrategy.deployed()
    })

    it('should revert withdraw if not amount', async () => {
      await expect(testStrategy.connect(test).withdraw(expandTo18Decimals(0))).to.be.revertedWith('!amount')
    })

    it('should withdraw amount', async () => {
      // setup TEST_LP balance
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to TestStrategy contract
      testLP.connect(test).approve(testStrategy.address, MaxUint256)
      // make deposit
      await testStrategy.connect(test).deposit(expandTo18Decimals(500))
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(500))

      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(expandTo18Decimals(100))
      expect(shares).to.be.equal(expandTo18Decimals(100))
      expect(deposit).to.be.equal(expandTo18Decimals(100))
      expect(want).to.be.equal(expandTo18Decimals(100))
      // make withdraw
      await testStrategy.connect(test).withdraw(expandTo18Decimals(100))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(400))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(400))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(400))
    })

    it('should make second withdraw', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(400))

      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      expect(want).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await testStrategy.connect(test).withdraw(expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(350))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(350))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(350))
    })

    it('should make third withdraw', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(350))

      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(expandTo18Decimals(50))
      expect(shares).to.be.equal(expandTo18Decimals(50))
      expect(deposit).to.be.equal(expandTo18Decimals(50))
      expect(want).to.be.equal(expandTo18Decimals(50))
      // make withdraw
      await testStrategy.connect(test).withdraw(expandTo18Decimals(50))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(300))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(300))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(300))
    })
  })

  describe('Test harvest()', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      // will make a local deployment for tests, that way, the owner will be test wallet
      // instead of BalleMaster contract
      TestStrategy = await ethers.getContractFactory('TestStrategy')
      testStrategy = await TestStrategy.deploy(test.address, testLP.address, testLP.address)
      await testStrategy.deployed()
    })

    it('should harvest and increment 1%', async () => {
      // setup TEST_LP balance
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP transfer to TestStrategy contract
      testLP.connect(test).approve(testStrategy.address, MaxUint256)
      // make deposit
      await testStrategy.connect(test).deposit(expandTo18Decimals(500))
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(500))

      // make harvest
      await testStrategy.connect(deployer).harvest()

      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(505))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(505))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should harvest and increment another 1%', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(505))

      // make harvest
      await testStrategy.connect(deployer).harvest()

      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('510050000000000000000')
      expect(await testStrategy.depositTotal()).to.be.equal('510050000000000000000')
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })
  })

  describe('Test operation', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      testLP = await ethers.getContract('TestLP')
      // will make a local deployment for tests, that way, the owner will be test wallet
      // instead of BalleMaster contract
      TestStrategy = await ethers.getContractFactory('TestStrategy')
      testStrategy = await TestStrategy.deploy(test.address, testLP.address, testLP.address)
      await testStrategy.deployed()
    })

    it('should make deposit', async () => {
      // setup TEST_LP balance
      await testLP.mint(test.address, expandTo18Decimals(1000))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(1000))
      // approve TEST_LP transfer to TestStrategy contract
      testLP.connect(test).approve(testStrategy.address, MaxUint256)
      // make deposit
      await testStrategy.connect(test).deposit(expandTo18Decimals(800))
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(800))
    })

    it('should harvest and increment deposit 1%', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(800))

      // make harvest
      await testStrategy.connect(deployer).harvest()

      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(808))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(808))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(800))
    })

    it('should withdraw 300 shares', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(808))

      // For testing withdraw we must calculate the amount who corresponds to user shares
      // (it's made in BalleMaster when used)
      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(expandTo18Decimals(303))
      expect(shares).to.be.equal(expandTo18Decimals(300))
      expect(deposit).to.be.equal(expandTo18Decimals(303))
      expect(want).to.be.equal(expandTo18Decimals(303))
      // make withdraw
      await testStrategy.connect(test).withdraw(expandTo18Decimals(303))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(505))
      expect(await testStrategy.depositTotal()).to.be.equal(expandTo18Decimals(505))
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should harvest and increment deposit 1%', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(505))

      // make harvest
      await testStrategy.connect(deployer).harvest()

      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('510050000000000000000')
      expect(await testStrategy.depositTotal()).to.be.equal('510050000000000000000')
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should add deposit', async () => {
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(503))
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('510050000000000000000')

      // use callStatic to check return value of solidity function
      expect(await testStrategy.connect(test).callStatic.deposit(expandTo18Decimals(500))).to.be.equal(
        '490148024703460445054',
      )
      // make deposit
      await testStrategy.connect(test).deposit(expandTo18Decimals(500))
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('1010050000000000000000')
      expect(await testStrategy.depositTotal()).to.be.equal('1010050000000000000000')
      expect(await testStrategy.sharesTotal()).to.be.equal('990148024703460445054')
    })

    it('should harvest and increment deposit 1%', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('1010050000000000000000')

      // make harvest
      await testStrategy.connect(deployer).harvest()

      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('1020150500000000000000')
      expect(await testStrategy.depositTotal()).to.be.equal('1020150500000000000000')
      expect(await testStrategy.sharesTotal()).to.be.equal('990148024703460445054')
    })

    it('should withdraw 490.148 shares', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('1020150500000000000000')

      // For testing withdraw we must calculate the amount who corresponds to user shares
      // (it's made in BalleMaster when used)
      let amount = BigNumber.from('490148024703460445054')
        .mul(BigNumber.from('1020150500000000000000'))
        .div(BigNumber.from('990148024703460445054'))
      // rounding issue: amount shoul be '505000000000000000000'
      expect(amount).to.be.equal('504999999999999999999')
      // get rid of rounding issue
      amount = BigNumber.from('505000000000000000000')

      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(amount)
      expect(shares).to.be.equal('490148024703460445054')
      expect(deposit).to.be.equal('505000000000000000000')
      expect(want).to.be.equal('505000000000000000000')
      // make withdraw
      await testStrategy.connect(test).withdraw(amount)
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('515150500000000000000')
      expect(await testStrategy.depositTotal()).to.be.equal('515150500000000000000')
      expect(await testStrategy.sharesTotal()).to.be.equal(expandTo18Decimals(500))
    })

    it('should withdraw last 500 shares', async () => {
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal('515150500000000000000')

      // For testing withdraw we must calculate the amount who corresponds to user shares
      // (it's made in BalleMaster when used)
      const amount = BigNumber.from('500000000000000000000')
        .mul(BigNumber.from('515150500000000000000'))
        .div(BigNumber.from('500000000000000000000'))
      expect(amount).to.be.equal('515150500000000000000')

      // use callStatic to check return value of solidity function
      const [shares, deposit, want] = await testStrategy.connect(test).callStatic.withdraw(amount)
      expect(shares).to.be.equal('500000000000000000000')
      expect(deposit).to.be.equal('515150500000000000000')
      expect(want).to.be.equal('515150500000000000000')
      // make withdraw
      await testStrategy.connect(test).withdraw(amount)
      // check values
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(0)
      expect(await testStrategy.depositTotal()).to.be.equal(0)
      expect(await testStrategy.sharesTotal()).to.be.equal(0)
    })
  })
})
