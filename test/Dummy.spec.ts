import { ethers } from 'hardhat'
import { expect } from './shared/expect'

describe('Dummy', () => {
  it('should get initial data', async () => {
    const Dummy = await ethers.getContractFactory('Dummy')
    const dummy = await Dummy.deploy()

    await dummy.deployed()
    expect(await dummy.getDummyData()).to.be.equal(0)
  })

  it('should set new data', async () => {
    const Dummy = await ethers.getContractFactory('Dummy')
    const dummy = await Dummy.deploy()

    await dummy.deployed()
    const [owner, addr1] = await ethers.getSigners()
    await dummy.connect(owner).setDummyData(123)
    expect(await dummy.connect(addr1).getDummyData()).to.be.equal(123)
  })
})
