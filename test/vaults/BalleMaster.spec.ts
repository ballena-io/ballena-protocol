import { Contract, ContractFactory } from '@ethersproject/contracts'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers, deployments } from 'hardhat'
import { BigNumber } from 'ethers'
import { expect } from '../shared/expect'
import { getBlockNumber, mineBlock } from '../shared/hardhatNode'
import { expandTo18Decimals } from '../../src/utils'
import { MaxUint256, ZERO_ADDRESS } from '../../src/utils/constants'

describe('BalleMaster', () => {
  let balle: Contract
  let BalleMaster: ContractFactory
  let balleMaster: Contract
  let testStrategy: Contract
  let testLP: Contract
  let tokenA: Contract
  let deployer: SignerWithAddress, test: SignerWithAddress
  let LocalStrategy: ContractFactory
  let localStrategy1: Contract
  let localStrategy2: Contract
  let startBlock: number
  let endBlock: number

  before('Load contract factory and deploy contracts', async () => {
    await deployments.fixture()
    balle = await ethers.getContract('BALLEv2')

    BalleMaster = await ethers.getContractFactory('BalleMaster')
    ;({ deployer, test } = await ethers.getNamedSigners())
    LocalStrategy = await ethers.getContractFactory('TestStrategy')
  })

  describe('Test constructor', () => {
    it('should create contract', async () => {
      balleMaster = await BalleMaster.deploy(
        balle.address,
        BigNumber.from('228310502283105'),
        expandTo18Decimals(24000),
        86400000,
      )
      await balleMaster.deployed()

      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(BigNumber.from('228310502283105'))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(24000))
      expect(await balleMaster.approvalDelay()).to.be.equal(86400000)
    })
  })

  describe('Test strategy upgrade timelock', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy1.deployed()
    })

    it('should revert if anyone (not owner) try to propose strategy upgrade', async () => {
      await expect(balleMaster.connect(test).proposeStratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to propose strategy upgrade non existent vault', async () => {
      await expect(balleMaster.connect(deployer).proposeStratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        '!vault',
      )
    })

    it('should revert if anyone (not owner) try to strategy upgrade', async () => {
      await expect(balleMaster.connect(test).stratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to strategy upgrade non existent vault', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, localStrategy1.address)).to.be.revertedWith('!vault')
    })

    it('should revert if anyone (not owner) try to emergency strategy upgrade', async () => {
      await expect(balleMaster.connect(test).emergencyStratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to emergency strategy upgrade non existent vault', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        '!vault',
      )
    })

    it('should add new vault #0', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should revert if try to propose strategy upgrade with zero address', async () => {
      await expect(balleMaster.connect(deployer).proposeStratUpgrade(0, ZERO_ADDRESS)).to.be.revertedWith('!strat')
    })

    it('should propose strat upgrade', async () => {
      await expect(balleMaster.connect(deployer).proposeStratUpgrade(0, localStrategy1.address))
        .to.emit(balleMaster, 'ProposeStratUpgrade')
        .withArgs(0, localStrategy1.address)
    })

    it('should revert if try to strategy upgrade with zero address', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, ZERO_ADDRESS)).to.be.revertedWith('!strat')
    })

    it('should revert if try to emergency strategy upgrade with zero address', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, ZERO_ADDRESS)).to.be.revertedWith('!strat')
    })

    it('should revert if try to strategy upgrade and timelock not expired', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        '!timelock',
      )
    })

    it('should revert if try to emergency strategy upgrade and timelock not expired', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, localStrategy1.address)).to.be.revertedWith(
        '!timelock',
      )
    })

    it('should revert if try to strategy upgrade with a different strat', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, testStrategy.address)).to.be.revertedWith('!strat')
    })

    it('should revert if try to emergency strategy upgrade with a different strat', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, testStrategy.address)).to.be.revertedWith(
        '!strat',
      )
    })
  })

  describe('Test strategy upgrade', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await BalleMaster.deploy(
        balle.address,
        BigNumber.from('228310502283105'),
        expandTo18Decimals(24000),
        0,
      )
      await balleMaster.deployed()
      testLP = await ethers.getContract('TestLP')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy1.deployed()
      localStrategy2 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy2.deployed()
    })

    it('should add new vault #0', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, localStrategy1.address)
    })

    it('should propose strat upgrade', async () => {
      await expect(balleMaster.connect(deployer).proposeStratUpgrade(0, localStrategy2.address))
        .to.emit(balleMaster, 'ProposeStratUpgrade')
        .withArgs(0, localStrategy2.address)
    })

    it('should strat upgrade', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, localStrategy2.address))
        .to.emit(balleMaster, 'StratUpgrade')
        .withArgs(0, localStrategy2.address)
    })

    it('should revert if try to strategy upgrade again', async () => {
      await expect(balleMaster.connect(deployer).stratUpgrade(0, localStrategy2.address)).to.be.revertedWith('!strat')
    })
  })

  describe('Test emergency strategy upgrade', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await BalleMaster.deploy(
        balle.address,
        BigNumber.from('228310502283105'),
        expandTo18Decimals(24000),
        0,
      )
      await balleMaster.deployed()
      testLP = await ethers.getContract('TestLP')
      tokenA = await ethers.getContract('TokenA')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, tokenA.address)
      await localStrategy1.deployed()
      localStrategy2 = await LocalStrategy.deploy(balleMaster.address, testLP.address, tokenA.address)
      await localStrategy2.deployed()
    })

    it('should add new vault #0', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, tokenA.address, localStrategy1.address)
    })

    it('should propose strat upgrade', async () => {
      await expect(balleMaster.connect(deployer).proposeStratUpgrade(0, localStrategy2.address))
        .to.emit(balleMaster, 'ProposeStratUpgrade')
        .withArgs(0, localStrategy2.address)
    })

    it('should strat upgrade', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, localStrategy2.address))
        .to.emit(balleMaster, 'EmergencyStratUpgrade')
        .withArgs(0, localStrategy2.address)
    })

    it('should revert if try to strategy upgrade again', async () => {
      await expect(balleMaster.connect(deployer).emergencyStratUpgrade(0, localStrategy2.address)).to.be.revertedWith(
        '!strat',
      )
    })
  })

  describe('Manage vaults', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')
      tokenA = await ethers.getContract('TokenA')
    })

    it('should revert if anyone (not owner) try to add new vault', async () => {
      await expect(
        balleMaster.connect(test).addVault(testLP.address, testLP.address, testStrategy.address),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if zero address strat on add new vault', async () => {
      await expect(
        balleMaster.connect(deployer).addVault(testLP.address, testLP.address, ZERO_ADDRESS),
      ).to.be.revertedWith('!strat')
    })

    it('should revert if deposit token does not match strat deposit token on add new vault', async () => {
      await expect(
        balleMaster.connect(deployer).addVault(tokenA.address, testLP.address, testStrategy.address),
      ).to.be.revertedWith('!depositToken')
    })

    it('should revert if want token does not match strat want token on add new vault', async () => {
      await expect(
        balleMaster.connect(deployer).addVault(testLP.address, tokenA.address, testStrategy.address),
      ).to.be.revertedWith('!wantToken')
    })

    it('should add new vault #0', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should get total vault count', async () => {
      expect(await balleMaster.vaultLength()).to.be.equal(1)
    })

    it('should revert if anyone (not owner) try to activate vault #0 rewards', async () => {
      await expect(balleMaster.connect(test).activateVaultRewards(0, 100)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to activate rewards on non existent vault', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(99, 100)).to.be.revertedWith('!vault')
    })

    it('should revert if try to activate vault #0 rewards with 0 allocPoint', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(0, 0)).to.be.revertedWith('!allocpoint')
    })

    it('should activate vault #0 rewards', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(0, 100))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(0, 100)
      startBlock = await getBlockNumber()
      endBlock = startBlock + 50
      expect(await balleMaster.startBlock()).to.be.equal(startBlock)
      expect(await balleMaster.endBlock()).to.be.equal(endBlock)
    })

    it('should revert if try to activate an already activated vault', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(0, 100)).to.be.revertedWith('active')
    })

    it('should add new vault #1', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should revert if try to modify rewards on non active vault', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(1, 200)).to.be.revertedWith('!active')
    })

    it('should activate vault #1 rewards', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(1, 200))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(1, 200)
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(300)
    })

    it('should revert if anyone (not owner) try to modify vault #1 rewards', async () => {
      await expect(balleMaster.connect(test).modifyVaultRewards(1, 100)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to modify rewards on non existent vault', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(99, 100)).to.be.revertedWith('!vault')
    })

    it('should revert if try to modify vault #1 rewards with 0 allocPoint', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(1, 0)).to.be.revertedWith('!allocpoint')
    })

    it('should modify vault #1 rewards', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(1, 500))
        .to.emit(balleMaster, 'ModifyRewards')
        .withArgs(1, 500)
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(600)
    })

    it('should revert if anyone (not owner) try to deactivate vault #1 rewards', async () => {
      await expect(balleMaster.connect(test).deactivateVaultRewards(1)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      )
    })

    it('should revert if try to deactivate rewards on non existent vault', async () => {
      await expect(balleMaster.connect(deployer).deactivateVaultRewards(99)).to.be.revertedWith('!vault')
    })

    it('should deactivate vault #1 rewards', async () => {
      await expect(balleMaster.connect(deployer).deactivateVaultRewards(1))
        .to.emit(balleMaster, 'DeactivateRewards')
        .withArgs(1)
    })

    it('should revert if try to deactivate already deactivated vault #1', async () => {
      await expect(balleMaster.connect(deployer).deactivateVaultRewards(1)).to.be.revertedWith('!active')
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(100)
    })

    it('should check getBlockMultiplier()', async () => {
      expect(await balleMaster.getBlockMultiplier(endBlock, startBlock)).to.be.equal(0)
      expect(await balleMaster.getBlockMultiplier(startBlock - 1, startBlock - 1)).to.be.equal(0)
      expect(await balleMaster.getBlockMultiplier(endBlock + 1, endBlock + 2)).to.be.equal(0)
      expect(await balleMaster.getBlockMultiplier(0, startBlock + 3)).to.be.equal(3)
      expect(await balleMaster.getBlockMultiplier(startBlock, startBlock + 5)).to.be.equal(5)
    })

    it('should revert if anyone (not owner) try to pause vault', async () => {
      await expect(balleMaster.connect(test).pauseVault(1)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to pause non existent vault', async () => {
      await expect(balleMaster.connect(deployer).pauseVault(99)).to.be.revertedWith('!vault')
    })

    it('should revert if anyone (not owner) try to unpause vault', async () => {
      await expect(balleMaster.connect(test).unpauseVault(1)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to unpause non existent vault', async () => {
      await expect(balleMaster.connect(deployer).unpauseVault(99)).to.be.revertedWith('!vault')
    })

    it('should revert if try to unpause not paused vault', async () => {
      await expect(balleMaster.connect(deployer).unpauseVault(1)).to.be.revertedWith('!paused')
    })

    it('should pause vault #1', async () => {
      await expect(balleMaster.connect(deployer).pauseVault(1)).to.emit(balleMaster, 'PauseVault').withArgs(1)
    })

    it('should revert if try to pause already paused vault', async () => {
      await expect(balleMaster.connect(deployer).pauseVault(1)).to.be.revertedWith('!active')
    })

    it('should revert if anyone (not owner) try to panic vault', async () => {
      await expect(balleMaster.connect(test).panicVault(1)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to panic non existent vault', async () => {
      await expect(balleMaster.connect(deployer).panicVault(99)).to.be.revertedWith('!vault')
    })

    it('should revert if try to panic paused vault', async () => {
      await expect(balleMaster.connect(deployer).panicVault(1)).to.be.revertedWith('!active')
    })

    it('should unpause vault #1', async () => {
      await expect(balleMaster.connect(deployer).unpauseVault(1)).to.emit(balleMaster, 'UnpauseVault').withArgs(1)
    })

    it('should panic vault #1', async () => {
      await expect(balleMaster.connect(deployer).panicVault(1)).to.emit(balleMaster, 'PanicVault').withArgs(1)
    })

    it('should unpause vault #1 after panic', async () => {
      await expect(balleMaster.connect(deployer).unpauseVault(1)).to.emit(balleMaster, 'UnpauseVault').withArgs(1)
    })

    it('should revert if anyone (not owner) try to retire vault', async () => {
      await expect(balleMaster.connect(test).retireVault(1)).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to retire non existent vault', async () => {
      await expect(balleMaster.connect(deployer).retireVault(99)).to.be.revertedWith('!vault')
    })

    it('should retire vault #1', async () => {
      await expect(balleMaster.connect(deployer).retireVault(1)).to.emit(balleMaster, 'RetireVault').withArgs(1)
    })

    it('should revert if try to retire already retired vault', async () => {
      await expect(balleMaster.connect(deployer).retireVault(1)).to.be.revertedWith('!active')
    })

    it('should retire vault #0', async () => {
      await expect(balleMaster.connect(deployer).retireVault(0))
        .to.emit(balleMaster, 'RetireVault')
        .withArgs(0)
        .and.to.emit(balleMaster, 'DeactivateRewards')
        .withArgs(0)
    })

    it('should update totalAllocPoint', async () => {
      expect(await balleMaster.totalAllocPoint()).to.be.equal(0)
    })
  })

  describe('Deposit & withdraw', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')

      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
      // create new vault
      balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should revert if deposit to non existent vault', async () => {
      await expect(balleMaster.connect(deployer).deposit(99, expandTo18Decimals(100))).to.be.revertedWith('!vault')
    })

    it('should revert if withdraw from non existent vault', async () => {
      await expect(balleMaster.connect(deployer).withdraw(99, expandTo18Decimals(100))).to.be.revertedWith('!vault')
    })

    it('should revert if withdraw from vault with no deposits', async () => {
      await expect(balleMaster.connect(deployer).withdraw(0, expandTo18Decimals(100))).to.be.revertedWith(
        '!sharesTotal',
      )
    })

    it('should deposit from user 1', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
    })

    it('should harvest from user 1', async () => {
      await expect(balleMaster.connect(deployer).withdraw(0, 0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, 0, 0)
    })

    it('should revert withdraw from user 2', async () => {
      await expect(balleMaster.connect(test).withdraw(0, 0)).to.be.revertedWith('!user.shares')
    })

    it('should withdrawAll from user 1', async () => {
      await expect(balleMaster.connect(deployer).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
    })

    it('should deposit from user 2', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(150)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(150), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(150))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(150))
    })

    it('should depositAll from user 2', async () => {
      await expect(balleMaster.connect(test).depositAll(0))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(350), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(500))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(500))
    })

    it('should partial withdraw from user 2', async () => {
      await expect(balleMaster.connect(test).withdraw(0, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(200), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(300))
    })

    it('should withdraw from user 2', async () => {
      await expect(balleMaster.connect(test).withdraw(0, expandTo18Decimals(300)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(300), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(0)
    })
  })

  describe('Deposit & Withdraw when wantToken != depositToken', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testLP = await ethers.getContract('TestLP')
      tokenA = await ethers.getContract('TokenA')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, tokenA.address)
      await localStrategy1.deployed()

      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
      // create new vault
      balleMaster.connect(deployer).addVault(testLP.address, tokenA.address, localStrategy1.address)
    })

    it('should deposit from user 1', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(400)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(400), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(400))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(400))
    })

    it('should deposit from user 2', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(200), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(200))
    })

    it('should partial withdraw both tokens from user 1', async () => {
      await expect(balleMaster.connect(deployer).withdraw(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(300))
    })

    it('should add deposit from user 2', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(200), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(400))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(400))
    })

    it('should withdraw both tokens from user 1', async () => {
      await expect(balleMaster.connect(deployer).withdraw(0, expandTo18Decimals(300)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(300), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(0)
    })

    it('should withdrawAll both tokens from user 2', async () => {
      await expect(balleMaster.connect(test).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(400), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(0)
    })
  })

  describe('Rewards calculation', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testLP = await ethers.getContract('TestLP')
      localStrategy1 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy1.deployed()
      localStrategy2 = await LocalStrategy.deploy(balleMaster.address, testLP.address, testLP.address)
      await localStrategy2.deployed()

      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
    })

    it('should have testing reward parameters', async () => {
      expect(await balleMaster.balle()).to.be.equal(balle.address)
      expect(await balleMaster.ballePerBlock()).to.be.equal(expandTo18Decimals(1))
      expect(await balleMaster.balleTotalRewards()).to.be.equal(expandTo18Decimals(50))
    })

    it('should add vault #0', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, localStrategy1.address)
    })

    it('should deposit from user 1 on vault #0', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
    })

    it('should not give BALLE because not activated rewards on vault #0', async () => {
      mineBlock()
      mineBlock()
      mineBlock()
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
    })

    it('should activate vault #0 with 1x rewards', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(0, 100))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(0, 100)
      startBlock = await getBlockNumber()
      endBlock = startBlock + 50
      expect(await balleMaster.startBlock()).to.be.equal(startBlock)
      expect(await balleMaster.endBlock()).to.be.equal(endBlock)
    })

    it('should give BALLE for user 1 on vault #0', async () => {
      mineBlock()
      // 1 block of accumulated rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(expandTo18Decimals(1))
    })

    it('should get rewards on add deposit with one vault and one user on vault #0', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(100), expandTo18Decimals(2))
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(2))
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
    })

    it('should accumulate BALLE on vault #0', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(expandTo18Decimals(2))
    })

    it('should deposit from user 2 on vault #0', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(200), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(0)
    })

    it('should accumulate BALLE on vault #0', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(expandTo18Decimals(4))
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(expandTo18Decimals(1))
    })

    it('should add vault #1', async () => {
      await balleMaster.connect(deployer).addVault(testLP.address, testLP.address, localStrategy2.address)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('4500000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('1500000000000000000')
    })

    it('should deposit from user 1 on vault #1', async () => {
      await expect(balleMaster.connect(deployer).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), 0)
      expect(await balleMaster.userDeposit(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.depositTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('5000000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('2000000000000000000')
    })

    it('should activate vault #1 with 3x rewards', async () => {
      await expect(balleMaster.connect(deployer).activateVaultRewards(1, 300))
        .to.emit(balleMaster, 'ActivateRewards')
        .withArgs(1, 300)
      expect(await balleMaster.totalAllocPoint()).to.be.equal(400)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('5500000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('2500000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
    })

    it('should accumulate BALLE on vaults with new rate', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards with new rate
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('5750000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('2750000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('1500000000000000000')
    })

    it('should get rewards to user 1 on add deposit on vault #1', async () => {
      await expect(balleMaster.connect(deployer).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '2250000000000000000')
      expect(await balleMaster.userDeposit(1, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.depositTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(200))
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('5875000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('2875000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('4250000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
    })

    it('should accumulate BALLE on vaults #0 and #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6125000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3125000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('1500000000000000000')
    })

    it('should get rewards on partial withdraw with multiple vault and one user on vault #1', async () => {
      await expect(balleMaster.connect(deployer).withdraw(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '2250000000000000000')
      expect(await balleMaster.userDeposit(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.depositTokens(1, deployer.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6250000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3250000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('6500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal(0)
    })

    it('should deactivate vault #0 rewards', async () => {
      await expect(balleMaster.connect(deployer).deactivateVaultRewards(0))
        .to.emit(balleMaster, 'DeactivateRewards')
        .withArgs(0)
      expect(await balleMaster.totalAllocPoint()).to.be.equal(300)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('750000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('2750000000000000000')
    })

    it('should deposit from user 2 on vault #1', async () => {
      await expect(balleMaster.connect(test).deposit(1, expandTo18Decimals(100)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 1, expandTo18Decimals(100), 0)
      expect(await balleMaster.userDeposit(1, test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.depositTokens(1, test.address)).to.be.equal(expandTo18Decimals(100))
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('3750000000000000000')
    })

    it('should accumulate BALLE for on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('4750000000000000000')
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('1000000000000000000')
    })

    it('should get rewards on add deposit with multiple vault and multiple user on vault #1', async () => {
      await expect(balleMaster.connect(test).deposit(1, expandTo18Decimals(200)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 1, expandTo18Decimals(200), '1500000000000000000')
      expect(await balleMaster.userDeposit(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('5250000000000000000')
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('6500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal('5750000000000000000')
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('1500000000000000000')
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('6500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should get rewards on withdrawAll from user 1 with multiple vault and multiple user on vault #1', async () => {
      await expect(balleMaster.connect(deployer).withdrawAll(1))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 1, expandTo18Decimals(100), '6000000000000000000')
      expect(await balleMaster.userDeposit(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('2250000000000000000')
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('4249999999800000000') // rounding issue (this happens!)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should modify vault #1 with x5 rewards', async () => {
      await expect(balleMaster.connect(deployer).modifyVaultRewards(1, 500))
        .to.emit(balleMaster, 'ModifyRewards')
        .withArgs(1, 500)
      expect(await balleMaster.totalAllocPoint()).to.be.equal(500)
      // check pending rewards (has no effect because only one active vault, so, gets all anyway)
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('5250000000000000000') // rounding resolved (this happens too!)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      mineBlock()
      mineBlock()
      // 2 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal('7249999999800000000') // rounding again
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('1500000000000000000')
    })

    it('should harvest BALLE rewards for user 1 on vault #1', async () => {
      await expect(balleMaster.connect(test).withdraw(1, 0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 1, 0, '8250000000000000000') // rounding resolved again
      expect(await balleMaster.userDeposit(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(1, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('9750000000000000000')
    })

    it('should accumulate BALLE on vault #1', async () => {
      // 32 blocks till here, so, 32 BALLE distributed on rewards, 18 more to be distributed
      const currentBlock = await getBlockNumber()
      for (let i = currentBlock; i <= endBlock; i++) {
        mineBlock()
      }
      // 18 block of accumulated rewards, vault 0 does not acc, vault 1 gets all
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(expandTo18Decimals(18))
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('9750000000000000000')
    })

    it('should not get more rewards when all distributed', async () => {
      mineBlock()
      mineBlock()
      // no more rewards left
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal('6375000000000000000')
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(expandTo18Decimals(18))
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('12500000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('9750000000000000000')
    })

    it('should get rewards on withdrawAll from user 1 on vault #0', async () => {
      await expect(balleMaster.connect(deployer).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(200), '6375000000000000000')
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal('3375000000000000000')
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(expandTo18Decimals(18))
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('18875000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('9750000000000000000')
    })

    it('should get rewards on withdrawAll from user 2 on vault #0', async () => {
      await expect(balleMaster.connect(test).withdrawAll(0))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 0, expandTo18Decimals(200), '3375000000000000000')
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(expandTo18Decimals(18))
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('18875000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('13125000000000000000')
    })

    it('should get rewards on withdrawAll from user 2 on vault #1', async () => {
      await expect(balleMaster.connect(test).withdrawAll(1))
        .to.emit(balleMaster, 'Withdraw')
        .withArgs(test.address, 1, expandTo18Decimals(300), expandTo18Decimals(18))
      expect(await balleMaster.userDeposit(1, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(1, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check pending rewards
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      // check BALLE balance
      expect(await balle.balanceOf(deployer.address)).to.be.equal('18875000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('31125000000000000000')
    })

    it('should all vaults be empty', async () => {
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, test.address)).to.be.equal(0)
      expect(await balleMaster.userDeposit(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, deployer.address)).to.be.equal(0)
      expect(await balleMaster.userDeposit(1, test.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(1, test.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(1, test.address)).to.be.equal(0)
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      expect(await balle.balanceOf(deployer.address)).to.be.equal('18875000000000000000')
      expect(await balle.balanceOf(test.address)).to.be.equal('31125000000000000000')
      expect(await balle.balanceOf(balleMaster.address)).to.be.equal(0)
    })
  })

  describe('Emergency functions', () => {
    before('Deploy contracts', async () => {
      await deployments.fixture()
      balle = await ethers.getContract('BALLEv2')
      balleMaster = await ethers.getContract('BalleMaster')
      testStrategy = await ethers.getContract('TestStrategy')
      testLP = await ethers.getContract('TestLP')

      // setup TEST_LP balance
      await testLP.mint(deployer.address, expandTo18Decimals(500))
      await testLP.mint(test.address, expandTo18Decimals(500))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(500))
      // approve TEST_LP allowances to BalleMaster contract
      testLP.connect(deployer).approve(balleMaster.address, MaxUint256)
      testLP.connect(test).approve(balleMaster.address, MaxUint256)
      // create new vault
      balleMaster.connect(deployer).addVault(testLP.address, testLP.address, testStrategy.address)
    })

    it('should deposit from user 1', async () => {
      await expect(balleMaster.connect(deployer).deposit(0, expandTo18Decimals(300)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(deployer.address, 0, expandTo18Decimals(300), 0)
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(expandTo18Decimals(300))
      // check LP balance
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(300))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(200))
    })

    it('should deposit from user 2', async () => {
      await expect(balleMaster.connect(test).deposit(0, expandTo18Decimals(300)))
        .to.emit(balleMaster, 'Deposit')
        .withArgs(test.address, 0, expandTo18Decimals(300), 0)
      expect(await balleMaster.userDeposit(0, test.address)).to.be.equal(expandTo18Decimals(300))
      expect(await balleMaster.depositTokens(0, test.address)).to.be.equal(expandTo18Decimals(300))
      // check LP balance
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(600))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(200))
    })

    it('should emergency withdraw from user 1', async () => {
      await expect(balleMaster.connect(deployer).emergencyWithdraw(0))
        .to.emit(balleMaster, 'EmergencyWithdraw')
        .withArgs(deployer.address, 0, expandTo18Decimals(300))
      expect(await balleMaster.userDeposit(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.depositTokens(0, deployer.address)).to.be.equal(0)
      expect(await balleMaster.pendingRewards(0, deployer.address)).to.be.equal(0)
      // check LP balance
      expect(await testLP.balanceOf(testStrategy.address)).to.be.equal(expandTo18Decimals(300))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
      expect(await testLP.balanceOf(test.address)).to.be.equal(expandTo18Decimals(200))
    })

    it('should revert if anyone (not owner) try to transfer stuck tokens', async () => {
      await expect(
        balleMaster.connect(test).inCaseTokensGetStuck(testLP.address, expandTo18Decimals(100)),
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('should revert if try to transfer stuck BALLE tokens', async () => {
      await expect(
        balleMaster.connect(deployer).inCaseTokensGetStuck(balle.address, expandTo18Decimals(100)),
      ).to.be.revertedWith('!safe')
    })

    it('should transfer stuck tokens', async () => {
      // Send tokens to contract.
      await testLP.connect(deployer).transfer(balleMaster.address, expandTo18Decimals(100))
      expect(await testLP.balanceOf(balleMaster.address)).to.be.equal(expandTo18Decimals(100))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(400))

      // Recover stuck tokens.
      await balleMaster.connect(deployer).inCaseTokensGetStuck(testLP.address, expandTo18Decimals(100))
      expect(await testLP.balanceOf(balleMaster.address)).to.be.equal(expandTo18Decimals(0))
      expect(await testLP.balanceOf(deployer.address)).to.be.equal(expandTo18Decimals(500))
    })
  })
})
