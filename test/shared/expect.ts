import { expect, use } from 'chai'
import { waffle } from 'hardhat'
import { jestSnapshotPlugin } from 'mocha-chai-jest-snapshot'

const { solidity } = waffle
use(solidity)
use(jestSnapshotPlugin())

export { expect }
