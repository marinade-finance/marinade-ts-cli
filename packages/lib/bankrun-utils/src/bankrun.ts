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
export const MINIMUM_SLOTS_PER_EPOCH = BigInt(32)
// https://github.com/solana-labs/solana/blob/v1.17.7/sdk/program/src/epoch_schedule.rs#L167
export function warpToEpoch(provider: BankrunProvider, epoch: number | bigint) {
  const epochBigInt = BigInt(epoch)
  const { slotsPerEpoch, firstNormalEpoch, firstNormalSlot } =
    provider.context.genesisConfig.epochSchedule
  let warpToSlot: bigint
  if (epochBigInt <= firstNormalEpoch) {
    warpToSlot =
      (BigInt(2) ** epochBigInt - BigInt(1)) * MINIMUM_SLOTS_PER_EPOCH
  } else {
    warpToSlot =
      (epochBigInt - firstNormalEpoch) * slotsPerEpoch + firstNormalSlot
  }
  provider.context.warpToSlot(warpToSlot)
}

export async function currentEpoch(provider: BankrunProvider): Promise<bigint> {
  return (await provider.context.banksClient.getClock()).epoch
}

export async function warpOffsetEpoch(
  provider: BankrunProvider,
  plusEpochs: number | bigint
) {
  const nextEpoch = (await currentEpoch(provider)) + BigInt(plusEpochs)
  warpToEpoch(provider, nextEpoch)
}

export async function warpToNextEpoch(provider: BankrunProvider) {
  await warpOffsetEpoch(provider, 1)
}

export async function currentSlot(provider: BankrunProvider): Promise<bigint> {
  return (await provider.context.banksClient.getClock()).slot
}

export async function warpOffsetSlot(
  provider: BankrunProvider,
  plusSlots: number | bigint
) {
  const nextSlot = (await currentSlot(provider)) + BigInt(plusSlots)
  warpOffsetSlot(provider, nextSlot)
  provider.context.warpToSlot(nextSlot)
}

export async function warpToNextSlot(provider: BankrunProvider) {
  await warpOffsetSlot(provider, 1)
}
