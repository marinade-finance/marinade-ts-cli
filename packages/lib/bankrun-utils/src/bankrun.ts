import { PublicKey } from '@solana/web3.js'
import { BankrunProvider } from 'anchor-bankrun'

export async function assertNotExist(
  provider: BankrunProvider,
  account: PublicKey
) {
  const accountInfo = await provider.context.banksClient.getAccount(account)
  expect(accountInfo).toBeNull()
}

// https://github.com/solana-labs/solana/blob/v1.17.7/sdk/program/src/epoch_schedule.rs#L29C1-L29C45
export const MINIMUM_SLOTS_PER_EPOCH = 32
// https://github.com/solana-labs/solana/blob/v1.17.7/sdk/program/src/epoch_schedule.rs#L167
export function warpToEpoch(provider: BankrunProvider, epoch: number) {
  const epochBigInt = BigInt(epoch)
  const { slotsPerEpoch, firstNormalEpoch, firstNormalSlot } =
    provider.context.genesisConfig.epochSchedule
  let warpToSlot: bigint
  if (epochBigInt <= firstNormalEpoch) {
    warpToSlot = BigInt((2 ** epoch - 1) * MINIMUM_SLOTS_PER_EPOCH)
  } else {
    warpToSlot =
      (epochBigInt - firstNormalEpoch) * slotsPerEpoch + firstNormalSlot
  }
  provider.context.warpToSlot(warpToSlot)
}

export async function warpToNextEpoch(provider: BankrunProvider) {
  await warpOffsetEpoch(provider, 1)
}

export async function warpOffsetEpoch(
  provider: BankrunProvider,
  plusEpochs: number
) {
  const nextEpoch = (await currentEpoch(provider)) + plusEpochs
  warpToEpoch(provider, nextEpoch)
}

export async function currentEpoch(provider: BankrunProvider): Promise<number> {
  return Number((await provider.context.banksClient.getClock()).epoch)
}

export async function warpToNextSlot(provider: BankrunProvider) {
  const currentSlot = (await provider.context.banksClient.getClock()).slot
  provider.context.warpToSlot(currentSlot + BigInt(1))
}
