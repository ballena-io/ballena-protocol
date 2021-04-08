import { network } from 'hardhat'

export async function passOneHour(): Promise<void> {
  await network.provider.request({
    method: 'evm_increaseTime',
    params: [3600],
  })
}

export async function getBlockNumber(): Promise<number> {
  return parseInt(await network.provider.send('eth_blockNumber', []))
}

export async function mineBlock(): Promise<void> {
  await network.provider.request({
    method: 'evm_mine',
    params: [],
  })
}
