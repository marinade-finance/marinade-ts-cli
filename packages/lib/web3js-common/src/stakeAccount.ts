import {
  AccountInfo,
  Connection,
  ParsedAccountData,
  PublicKey,
  StakeProgram,
} from '@solana/web3.js'
import BN from 'bn.js'
import { HasProvider, getConnection } from './account'
import { Provider } from './provider'

// NOTE1: code is adapted from https://github.com/marinade-finance/marinade-ts-sdk
// NOTE2: the getStakeAccount does not work with Bankrun as it uses getParsedAccountInfo which is not available in Bankrun
//        we need manual parsing which is not available in @solana/web3.js
//        at least so far, there is a work on generic parsing of accounts and instructions in the web3.js library

export const U64_MAX = new BN('ffffffffffffffff', 16)

export type StakeAccountParsed = {
  address: PublicKey
  withdrawer: PublicKey | null
  staker: PublicKey | null
  voter: PublicKey | null
  activationEpoch: BN | null
  deactivationEpoch: BN | null
  isCoolingDown: boolean
  isLockedUp: boolean
  balanceLamports: BN | null
  stakedLamports: BN | null
  currentEpoch: number
  currentTimestamp: number
}

async function parseStakeAccountData(
  connection: Connection,
  address: PublicKey,
  stakeAccountInfo: AccountInfo<ParsedAccountData>,
  currentEpoch?: number
): Promise<StakeAccountParsed> {
  const parsedData = stakeAccountInfo.data.parsed
  const activationEpoch = bnOrNull(
    parsedData?.info?.stake?.delegation?.activationEpoch ?? null
  )
  const deactivationEpoch = bnOrNull(
    parsedData?.info?.stake?.delegation?.deactivationEpoch ?? null
  )
  const lockup = parsedData?.info?.meta?.lockup
  const balanceLamports = bnOrNull(stakeAccountInfo.lamports)
  const stakedLamports = bnOrNull(
    parsedData?.info?.stake?.delegation.stake ?? null
  )
  if (currentEpoch === undefined) {
    ;({ epoch: currentEpoch } = await connection.getEpochInfo())
  }
  const currentTimestamp = Date.now() / 1000

  return {
    address: address,
    withdrawer: pubkeyOrNull(parsedData?.info?.meta?.authorized?.withdrawer),
    staker: pubkeyOrNull(parsedData?.info?.meta?.authorized?.staker),
    voter: pubkeyOrNull(parsedData?.info?.stake?.delegation?.voter),

    activationEpoch,
    deactivationEpoch,
    isCoolingDown: deactivationEpoch ? !deactivationEpoch.eq(U64_MAX) : false,
    isLockedUp:
      lockup?.custodian &&
      lockup?.custodian !== '' &&
      (lockup?.epoch > currentEpoch ||
        lockup?.unixTimestamp > currentTimestamp),
    balanceLamports,
    stakedLamports,
    currentEpoch,
    currentTimestamp,
  }
}

function isAccountInfoParsedData(
  data: AccountInfo<Buffer | ParsedAccountData> | null
): data is AccountInfo<ParsedAccountData> {
  if (data === null) {
    return false
  }
  return (
    data.data &&
    !(data.data instanceof Buffer) &&
    ('parsed' in data.data)
  )
}

export async function getStakeAccount(
  connection: Provider | Connection | HasProvider,
  address: PublicKey,
  currentEpoch?: number
): Promise<StakeAccountParsed> {
  connection = getConnection(connection)
  const { value: stakeAccountInfo } =
    await connection.getParsedAccountInfo(address)

  if (!stakeAccountInfo) {
    throw new Error(
      `Failed to find the stake account ${address.toBase58()}` +
        `at ${connection.rpcEndpoint}`
    )
  }
  if (!stakeAccountInfo.owner.equals(StakeProgram.programId)) {
    throw new Error(
      `${address.toBase58()} is not a stake account because owner is ${
        stakeAccountInfo.owner
      } at ${connection.rpcEndpoint}`
    )
  }
  if (!isAccountInfoParsedData(stakeAccountInfo)) {
    throw new Error(
      `Failed to parse the stake account ${address.toBase58()} data` +
        `at ${connection.rpcEndpoint}`
    )
  }

  return await parseStakeAccountData(
    connection,
    address,
    stakeAccountInfo,
    currentEpoch
  )
}

function pubkeyOrNull(
  value?: ConstructorParameters<typeof PublicKey>[0] | null
): PublicKey | null {
  return value === null || value === undefined ? null : new PublicKey(value)
}

function bnOrNull(
  value?: ConstructorParameters<typeof BN>[0] | null
): BN | null {
  return value === null || value === undefined ? null : new BN(value)
}
