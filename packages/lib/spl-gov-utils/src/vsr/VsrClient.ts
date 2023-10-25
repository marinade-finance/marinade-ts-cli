import { ConfirmOptions, Connection, Keypair, PublicKey } from '@solana/web3.js'
import * as generated from './VsrClientIdl'
import { encode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/utf8'
import { IdlTypes, Program, AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { getAssociatedTokenAddressSync } from 'solana-spl-token-modern'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { MNDE_VSR_PROGRAM_ID } from '../marinade-constants'

export type VoterStakeRegistry = generated.VoterStakeRegistry
export const VoterStakeRegistryIDL = generated.IDL
export type VoterStakeRegistryProgram = Program<VoterStakeRegistry>

export type VotingMintConfig = IdlTypes<VoterStakeRegistry>['VotingMintConfig']
export type LockupKind = IdlTypes<VoterStakeRegistry>['LockupKind']
export type Lockup = IdlTypes<VoterStakeRegistry>['Lockup']
export type DepositEntry = IdlTypes<VoterStakeRegistry>['DepositEntry']

export function getVsrProgram({
  connection,
  provider,
  wallet,
  opts,
  programId = MNDE_VSR_PROGRAM_ID,
}: {
  connection?: Connection
  provider?: AnchorProvider
  wallet?: Wallet | Keypair
  opts?: ConfirmOptions
  programId?: PublicKey
}): VoterStakeRegistryProgram {
  if (!provider && connection) {
    if (!wallet) {
      throw new Error(
        'wallet is required when provider is not specified to get VoterStakeRegistry program'
      )
    }
    if (wallet instanceof Keypair) {
      wallet = new NodeWallet(wallet)
    }
    provider = new AnchorProvider(
      connection,
      wallet,
      opts || { commitment: connection.commitment }
    )
  }
  if (!provider) {
    throw new Error(
      'provider or connection is required to get VoterStakeRegistry program'
    )
  }

  return new Program<VoterStakeRegistry>(
    VoterStakeRegistryIDL,
    programId,
    provider
  )
}

export enum LockupKindEnum {
  None = 'none',
  Daily = 'daily',
  Monthly = 'monthly',
  Cliff = 'cliff',
  Constant = 'constant',
}

export function lockupKind(lockupKind: LockupKind): LockupKindEnum {
  if (typeof lockupKind !== 'object' || Object.keys(lockupKind).length !== 1) {
    throw new Error('Cannot decode lockup kind: ' + lockupKind)
  }
  switch (Object.keys(lockupKind)[0]) {
    case 'none':
      return LockupKindEnum.None
    case 'daily':
      return LockupKindEnum.Daily
    case 'monthly':
      return LockupKindEnum.Monthly
    case 'cliff':
      return LockupKindEnum.Cliff
    case 'constant':
      return LockupKindEnum.Constant
    default:
      throw new Error('Cannot decode lockup kind: ' + lockupKind)
  }
}

// [realm.key().as_ref(), b"registrar".as_ref(), realm_governing_token_mint.key().as_ref()]
export function registrarAddress({
  programId,
  realm,
  mint,
}: {
  programId: PublicKey
  realm: PublicKey
  mint: PublicKey
}): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [realm.toBytes(), encode('registrar'), mint.toBytes()],
    programId
  )
}

// [registrar.key().as_ref(), b"voter-weight-record".as_ref(), voter_authority.key().as_ref()]
export function voterWeightRecordAddress({
  programId,
  registrar,
  voterAuthority,
}: {
  programId: PublicKey
  registrar: PublicKey
  voterAuthority: PublicKey
}): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      registrar.toBytes(),
      encode('voter-weight-record'),
      voterAuthority.toBytes(),
    ],
    programId
  )
}

// [registrar.key().as_ref(), b"voter".as_ref(), voter_authority.key().as_ref()]
export function voterAddress({
  programId,
  registrar,
  voterAuthority,
}: {
  programId: PublicKey
  registrar: PublicKey
  voterAuthority: PublicKey
}): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [registrar.toBytes(), encode('voter'), voterAuthority.toBytes()],
    programId
  )
}

export function vaultAddress({
  voter,
  mint,
}: {
  voter: PublicKey
  mint: PublicKey
}): PublicKey {
  return getAssociatedTokenAddressSync(mint, voter, true)
}
