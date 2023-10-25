import { PublicKey } from '@solana/web3.js'
import {
  DepositEntry,
  LockupKindEnum,
  VoterStakeRegistryProgram,
  VotingMintConfig,
  lockupKind,
  registrarAddress,
  voterAddress,
} from './VsrClient'

export type VsrDepositEntryResult =
  | { type: 'Existing'; index: number } // existing with the same lockup type
  | { type: 'EmptyEntryAt'; index: number } // voter account exists with closed/non-init entry at the index
  | { type: 'NoVoterAccount' } // no voter account exists
  | { type: 'NoDepositEntryAvailable'; depositEntries: DepositEntry[] } // all entries are occupied with some lockup types

/// null means we do not care
export type VsrDepositEntryFilter = {
  mint: PublicKey
  lockupKind: LockupKindEnum
  lockupPeriod: number
  allowClawback: boolean | null
}

/**
 * Search VSR mango plugin for Voter account deposit entry.
 * @returns {VsrDepositEntryResult} - Returns type 'Existing' when entry that matches the filter is found,
 *                                    type 'EmptyEntryAt' when not proprietary entry is found but there is empty place to create new,
 *                                    type 'NoVoterAccount' when no `Voter` account exists
 *                                    and type 'NoDepositEntryAvailable' when all entries are occupied no one is matching the filter.
 */
export async function getVsrDepositEntry({
  vsrProgram,
  realm,
  realmMint,
  authority,
  filter,
}: {
  vsrProgram: VoterStakeRegistryProgram
  realm: PublicKey
  realmMint: PublicKey
  authority: PublicKey
  filter: VsrDepositEntryFilter
}): Promise<VsrDepositEntryResult> {
  const registrar = registrarAddress({
    programId: vsrProgram.programId,
    realm,
    mint: realmMint,
  })[0]
  const voter = voterAddress({
    programId: vsrProgram.programId,
    registrar,
    voterAuthority: authority,
  })[0]
  const registrarData = await vsrProgram.account.registrar.fetchNullable(
    registrar
  )
  if (registrarData === null) {
    throw new Error(
      `Registrar account ${registrar.toBase58()} does not exist ` +
        `(VSR program id: ${vsrProgram.programId.toBase58()}, realm: ${realm.toBase58()}, mint: ${realmMint.toBase58()}})`
    )
  }
  const registrarVotingMints: VotingMintConfig[] =
    registrarData.votingMints as VotingMintConfig[]
  let vsrMintConfigIdx: number | undefined = undefined
  for (let i = 0; i < registrarVotingMints.length; i++) {
    if (registrarVotingMints[i].mint.equals(filter.mint)) {
      vsrMintConfigIdx = i
      break
    }
  }
  if (vsrMintConfigIdx === undefined) {
    throw new Error(
      `Mint ${filter.mint.toBase58()} is not configured in registrar ${registrar.toBase58()} ' +
      'at realm ${registrarData.realm.toBase58()}`
    )
  }

  const voterData = await vsrProgram.account.voter.fetchNullable(voter)
  if (voterData === null) {
    return { type: 'NoVoterAccount' }
  }

  // finding deposit entry with defined mint and with constant lockup type with 30 days lockup
  const deposits: DepositEntry[] = voterData.deposits as DepositEntry[]
  for (let i = 0; i < deposits.length; i++) {
    const { lockup, votingMintConfigIdx, allowClawback, isUsed } = deposits[i]
    if (
      votingMintConfigIdx === vsrMintConfigIdx &&
      filter.lockupKind === lockupKind(lockup.kind) &&
      lockup.endTs.sub(lockup.startTs).eqn(filter.lockupPeriod) &&
      (filter.allowClawback === null ||
        filter.allowClawback === allowClawback) &&
      isUsed
    ) {
      return { type: 'Existing', index: i }
    }
    if (!isUsed) {
      // the first available index that's not used will be taken
      return { type: 'EmptyEntryAt', index: i }
    }
  }

  // neither found existing entry with matching lockup type, nor non-used non-claimable entry
  return { type: 'NoDepositEntryAvailable', depositEntries: deposits }
}

export function groupUsedLockupsByKind(
  depositEntries: DepositEntry[],
  filterOutWithAllowClawback = true
): number[][] {
  const groupedItems: { [key: string]: number[] } = {}

  for (let i = 0; i < depositEntries.length; i++) {
    const {
      lockup,
      votingMintConfigIdx: mintIndex,
      isUsed,
      allowClawback,
    } = depositEntries[i]
    if (!isUsed) {
      // when not used, then not initialized (is closed) and there is nothing we can do with it later
      continue
    }
    if (filterOutWithAllowClawback && allowClawback) {
      // we don't want to work with lockups that can be clawed back
      continue
    }
    const duration = lockup.endTs.sub(lockup.startTs)
    const kind = lockupKind(lockup.kind)
    const key = `${mintIndex}_${kind}_${duration}`

    if (!groupedItems[key]) {
      groupedItems[key] = [i]
    } else {
      groupedItems[key].push(i)
    }
  }

  return Object.values(groupedItems)
}
