import * as BufferLayout from '@solana/buffer-layout'
import {
  Connection,
  PublicKey,
  Lockout,
  EpochCredits,
  BlockTimestamp,
  AuthorizedVoter,
  PriorVoter,
  AccountInfo,
} from '@solana/web3.js'
import { Provider } from '.'
import {
  HasProvider,
  ProgramAccountInfo,
  getConnection,
  programAccountInfo,
} from './account'

export async function getVoteAccount(
  providerOrConnection: Provider | Connection | HasProvider,
  address: PublicKey
): Promise<ProgramAccountInfo<VoteAccount>> {
  const connection = getConnection(providerOrConnection)
  const voteAccountInfo = await connection.getAccountInfo(address)
  if (voteAccountInfo === null) {
    throw new Error(
      `Vote account ${address.toBase58()} not found at endpoint ` +
        `${connection.rpcEndpoint}`
    )
  }

  return await getVoteAccountFromData(address, voteAccountInfo)
}

export async function getVoteAccountFromData(
  address: PublicKey,
  voteAccountInfo: AccountInfo<Buffer>
): Promise<ProgramAccountInfo<VoteAccount>> {
  const versionOffset = 4
  const version = VoteAccountVersionLayout.decode(
    toBuffer(voteAccountInfo.data),
    0
  ) as VoteAccountVersion

  let voteAccountData: VoteAccount
  if (version.V0_23_5) {
    voteAccountData = fromAccount0_23_5Data(voteAccountInfo.data, versionOffset)
  } else if (version.V1_14_11) {
    voteAccountData = fromAccount1_14_11Data(
      voteAccountInfo.data,
      versionOffset
    )
  } else if (version.CURRENT) {
    voteAccountData = fromAccountCURRENTData(
      toBuffer(voteAccountInfo.data),
      versionOffset
    )
  } else {
    throw new Error(
      `Unknown vote account version: ${JSON.stringify(
        version
      )} at ${address.toBase58()}`
    )
  }
  return programAccountInfo(address, voteAccountInfo, voteAccountData)
}

type VoteAccountArgs = {
  nodePubkey: PublicKey
  authorizedWithdrawer: PublicKey
  commission: number
  rootSlot: number | null
  votes: LandedVote[]
  authorizedVoters: AuthorizedVoter[]
  priorVoters: PriorVoter[]
  epochCredits: EpochCredits[]
  lastTimestamp: BlockTimestamp
}

export class VoteAccount {
  nodePubkey: PublicKey
  authorizedWithdrawer: PublicKey
  commission: number
  rootSlot: number | null
  votes: LandedVote[]
  authorizedVoters: AuthorizedVoter[]
  priorVoters: PriorVoter[]
  epochCredits: EpochCredits[]
  lastTimestamp: BlockTimestamp

  /**
   * @internal
   */
  constructor(args: VoteAccountArgs) {
    this.nodePubkey = args.nodePubkey
    this.authorizedWithdrawer = args.authorizedWithdrawer
    this.commission = args.commission
    this.rootSlot = args.rootSlot
    this.votes = args.votes
    this.authorizedVoters = args.authorizedVoters
    this.priorVoters = args.priorVoters
    this.epochCredits = args.epochCredits
    this.lastTimestamp = args.lastTimestamp
  }
}

/**
 * Deserialize VoteAccount CURRENT from the account data.
 */
function fromAccountCURRENTData(
  buffer: Buffer | Uint8Array | Array<number>,
  versionOffset: number
): VoteAccount {
  const voteAccountCURRENT = VoteAccountCURRENTLayout.decode(
    toBuffer(buffer),
    versionOffset
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (VoteAccount as any)({
    nodePubkey: new PublicKey(voteAccountCURRENT.nodePubkey),
    authorizedWithdrawer: new PublicKey(
      voteAccountCURRENT.authorizedWithdrawer
    ),
    commission: voteAccountCURRENT.commission,
    votes: voteAccountCURRENT.votes,
    rootSlot: voteAccountCURRENT.rootSlot,
    authorizedVoters:
      voteAccountCURRENT.authorizedVoters.map(parseAuthorizedVoter),
    priorVoters: getPriorVoters(voteAccountCURRENT.priorVoters),
    epochCredits: voteAccountCURRENT.epochCredits,
    lastTimestamp: voteAccountCURRENT.lastTimestamp,
  }) as VoteAccount
}

/**
 * Deserialize VoteAccount 1.14.11 from the account data.
 */
function fromAccount1_14_11Data(
  buffer: Buffer | Uint8Array | Array<number>,
  versionOffset: number
): VoteAccount {
  const voteAccount1_14_11 = VoteAccount1_14_11Layout.decode(
    toBuffer(buffer),
    versionOffset
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (VoteAccount as any)({
    nodePubkey: new PublicKey(voteAccount1_14_11.nodePubkey),
    authorizedWithdrawer: new PublicKey(
      voteAccount1_14_11.authorizedWithdrawer
    ),
    commission: voteAccount1_14_11.commission,
    votes: voteAccount1_14_11.votes.map(vote => {
      return { latency: 0, lockout: vote }
    }),
    rootSlot: voteAccount1_14_11.rootSlot,
    authorizedVoters:
      voteAccount1_14_11.authorizedVoters.map(parseAuthorizedVoter),
    priorVoters: getPriorVoters(voteAccount1_14_11.priorVoters),
    epochCredits: voteAccount1_14_11.epochCredits,
    lastTimestamp: voteAccount1_14_11.lastTimestamp,
  }) as VoteAccount
}

/**
 * Deserialize VoteAccount 0.23.5 from the account data.
 */
function fromAccount0_23_5Data(
  buffer: Buffer | Uint8Array | Array<number>,
  versionOffset: number
): VoteAccount {
  const voteAccount0_23_5 = VoteAccount0_23_5Layout.decode(
    toBuffer(buffer),
    versionOffset
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (VoteAccount as any)({
    nodePubkey: new PublicKey(voteAccount0_23_5.nodePubkey),
    authorizedWithdrawer: new PublicKey(voteAccount0_23_5.authorizedWithdrawer),
    commission: voteAccount0_23_5.commission,
    votes: voteAccount0_23_5.votes.map(vote => {
      return { latency: 0, lockout: vote }
    }),
    rootSlot: voteAccount0_23_5.rootSlot,
    authorizedVoters: [
      parseAuthorizedVoter({
        authorizedVoter: voteAccount0_23_5.authorizedVoter,
        epoch: voteAccount0_23_5.authorizedVoterEpoch,
      }),
    ],
    priorVoters: getPriorVoters(voteAccount0_23_5.priorVoters),
    epochCredits: voteAccount0_23_5.epochCredits,
    lastTimestamp: voteAccount0_23_5.lastTimestamp,
  }) as VoteAccount
}

export const toBuffer = (arr: Buffer | Uint8Array | Array<number>): Buffer => {
  if (Buffer.isBuffer(arr)) {
    return arr
  } else if (arr instanceof Uint8Array) {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
  } else {
    return Buffer.from(arr)
  }
}

// Stake account differentiates from Solana versions
// see https://github.com/solana-labs/solana/blob/v1.17.15/sdk/program/src/vote/state/vote_state_versions.rs#L15
// https://github.com/solana-labs/solana-web3.js/blob/v1.88.0/packages/library-legacy/src/vote-account.ts#L77

/**
 * Layout for a public key
 */
export function publicKey(property = 'publicKey'): BufferLayout.Blob {
  return BufferLayout.blob(32, property)
}

/**
 *
 * @param layout https://github.com/acheroncrypto/native-to-anchor/blob/master/client/packages/buffer-layout/src/index.ts
 */
export function option<T>(
  layout: BufferLayout.Layout<T>,
  property?: string
): BufferLayout.Layout<T | null> {
  return new OptionLayout<T>(layout, property)
}

class OptionLayout<T> extends BufferLayout.Layout<T | null> {
  layout: BufferLayout.Layout<T>
  discriminator: BufferLayout.Layout<number>

  constructor(layout: BufferLayout.Layout<T>, property?: string) {
    super(-1, property)
    this.layout = layout
    this.discriminator = BufferLayout.u8('option')
  }

  encode(src: T | null, b: Buffer, offset = 0): number {
    if (src === null || src === undefined) {
      return this.discriminator.encode(0, b, offset)
    }

    this.discriminator.encode(1, b, offset)
    return (
      this.discriminator.span +
      this.layout.encode(src, b, offset + this.discriminator.span)
    )
  }

  decode(b: Buffer, offset = 0): T | null {
    const discriminator = this.discriminator.decode(b, offset)
    if (discriminator === 0) {
      return null
    } else if (discriminator === 1) {
      return this.layout.decode(b, offset + this.discriminator.span)
    }

    throw new Error(
      `decode: Invalid option; option value: ${discriminator} : ${this.property}`
    )
  }

  getSpan(b: Buffer, offset = 0): number {
    const discriminator = this.discriminator.decode(b, offset)
    if (discriminator === 0) {
      return 1
    } else if (discriminator === 1) {
      return this.layout.getSpan(b, offset + 1) + 1
    }
    throw new Error('getSpan: Invalid option ' + this.property)
  }
}

type VoteAccountVersions = 'V0_23_5' | 'V1_14_11' | 'CURRENT' | 'UNKNOWN'

type VoteAccountVersion = Readonly<Record<VoteAccountVersions, {}>>

// https://github.com/solana-labs/solana/blob/v1.17/sdk/program/src/vote/state/vote_state_versions.rs#L4
const VoteAccountVersionLayout = BufferLayout.union(
  BufferLayout.u32(),
  BufferLayout.struct([BufferLayout.u32()])
)
VoteAccountVersionLayout.addVariant(0, BufferLayout.struct([]), 'V0_23_5')
VoteAccountVersionLayout.addVariant(1, BufferLayout.struct([]), 'V1_14_11')
VoteAccountVersionLayout.addVariant(2, BufferLayout.struct([]), 'CURRENT')

/**
 * See solana-labs/web3.js:
 *   https://github.com/solana-labs/solana-web3.js/blob/v1.88.0/packages/library-legacy/src/vote-account.ts#L77
 * See solana-labs/solana:
 *   https://github.com/solana-labs/solana/blob/v1.17.15/sdk/program/src/vote/state/vote_state_0_23_5.rs#L7
 * Data generated to:
 *   https://github.com/solana-labs/solana/blob/master/sdk/program/src/vote/state/mod.rs#L285
 */
const VoteAccount0_23_5Layout = BufferLayout.struct<VoteAccountData0_23_5>([
  publicKey('nodePubkey'),
  publicKey('authorizedVoter'),
  BufferLayout.nu64('authorizedVoterEpoch'),
  BufferLayout.struct<PriorVoters>(
    [
      BufferLayout.seq(
        BufferLayout.struct([
          publicKey('authorizedPubkey'),
          BufferLayout.nu64('epochOfLastAuthorizedSwitch'),
          BufferLayout.nu64('targetEpoch'),
        ]),
        32,
        'buf'
      ),
      BufferLayout.nu64('idx'),
      BufferLayout.u8('isEmpty'),
    ],
    'priorVoters'
  ),
  publicKey('authorizedWithdrawer'),
  BufferLayout.u8('commission'),
  BufferLayout.nu64(), // votes.length
  BufferLayout.seq<Lockout>(
    BufferLayout.struct([
      BufferLayout.nu64('slot'),
      BufferLayout.u32('confirmationCount'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'votes'
  ),
  option(BufferLayout.nu64(), 'rootSlot'),
  BufferLayout.nu64(), // epochCredits.length
  BufferLayout.seq<EpochCredits>(
    BufferLayout.struct([
      BufferLayout.nu64('epoch'),
      BufferLayout.nu64('credits'),
      BufferLayout.nu64('prevCredits'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'epochCredits'
  ),
  BufferLayout.struct<BlockTimestamp>(
    [BufferLayout.nu64('slot'), BufferLayout.nu64('timestamp')],
    'lastTimestamp'
  ),
])

const VoteAccount1_14_11Layout = BufferLayout.struct<VoteAccountData0_14_11>([
  publicKey('nodePubkey'),
  publicKey('authorizedWithdrawer'),
  BufferLayout.u8('commission'),
  BufferLayout.nu64(), // votes.length
  BufferLayout.seq<Lockout>(
    BufferLayout.struct([
      BufferLayout.nu64('slot'),
      BufferLayout.u32('confirmationCount'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'votes'
  ),
  option(BufferLayout.nu64(), 'rootSlot'),
  BufferLayout.nu64(), // authorizedVoters.length
  BufferLayout.seq<AuthorizedVoterRaw>(
    BufferLayout.struct([
      BufferLayout.nu64('epoch'),
      publicKey('authorizedVoter'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'authorizedVoters'
  ),
  BufferLayout.struct<PriorVoters>(
    [
      BufferLayout.seq(
        BufferLayout.struct([
          publicKey('authorizedPubkey'),
          BufferLayout.nu64('epochOfLastAuthorizedSwitch'),
          BufferLayout.nu64('targetEpoch'),
        ]),
        32,
        'buf'
      ),
      BufferLayout.nu64('idx'),
      BufferLayout.u8('isEmpty'),
    ],
    'priorVoters'
  ),
  BufferLayout.nu64(), // epochCredits.length
  BufferLayout.seq<EpochCredits>(
    BufferLayout.struct([
      BufferLayout.nu64('epoch'),
      BufferLayout.nu64('credits'),
      BufferLayout.nu64('prevCredits'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'epochCredits'
  ),
  BufferLayout.struct<BlockTimestamp>(
    [BufferLayout.nu64('slot'), BufferLayout.nu64('timestamp')],
    'lastTimestamp'
  ),
])

const VoteAccountCURRENTLayout = BufferLayout.struct<VoteAccountDataCURRENT>([
  publicKey('nodePubkey'),
  publicKey('authorizedWithdrawer'),
  BufferLayout.u8('commission'),
  BufferLayout.nu64(), // votes.length
  BufferLayout.seq<LandedVote>(
    BufferLayout.struct([
      BufferLayout.u8('latency'),
      BufferLayout.nu64('slot'),
      BufferLayout.u32('confirmationCount'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'votes'
  ),
  option(BufferLayout.nu64(), 'rootSlot'),
  BufferLayout.nu64(), // authorizedVoters.length
  BufferLayout.seq<AuthorizedVoterRaw>(
    BufferLayout.struct([
      BufferLayout.nu64('epoch'),
      publicKey('authorizedVoter'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'authorizedVoters'
  ),
  BufferLayout.struct<PriorVoters>(
    [
      BufferLayout.seq(
        BufferLayout.struct([
          publicKey('authorizedPubkey'),
          BufferLayout.nu64('epochOfLastAuthorizedSwitch'),
          BufferLayout.nu64('targetEpoch'),
        ]),
        32,
        'buf'
      ),
      BufferLayout.nu64('idx'),
      BufferLayout.u8('isEmpty'),
    ],
    'priorVoters'
  ),
  BufferLayout.nu64(), // epochCredits.length
  BufferLayout.seq<EpochCredits>(
    BufferLayout.struct([
      BufferLayout.nu64('epoch'),
      BufferLayout.nu64('credits'),
      BufferLayout.nu64('prevCredits'),
    ]),
    BufferLayout.offset(BufferLayout.u32(), -8),
    'epochCredits'
  ),
  BufferLayout.struct<BlockTimestamp>(
    [BufferLayout.nu64('slot'), BufferLayout.nu64('timestamp')],
    'lastTimestamp'
  ),
])

// copy out from:
// https://github.com/solana-labs/solana-web3.js/blob/24d71d600c90605a8c2022b020f749234ebc4809/packages/library-legacy/src/vote-account.ts#L77
type VoteAccountData0_23_5 = Readonly<{
  nodePubkey: Uint8Array
  authorizedVoter: Uint8Array
  authorizedVoterEpoch: number
  priorVoters: PriorVoters
  authorizedWithdrawer: Uint8Array
  commission: number
  votes: Lockout[]
  rootSlot: number | null
  epochCredits: EpochCredits[]
  lastTimestamp: BlockTimestamp
}>

type VoteAccountData0_14_11 = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[]
  authorizedWithdrawer: Uint8Array
  commission: number
  epochCredits: EpochCredits[]
  lastTimestamp: BlockTimestamp
  nodePubkey: Uint8Array
  priorVoters: PriorVoters
  rootSlot: number | null
  votes: Lockout[]
}>

type VoteAccountDataCURRENT = Readonly<{
  authorizedVoters: AuthorizedVoterRaw[]
  authorizedWithdrawer: Uint8Array
  commission: number
  epochCredits: EpochCredits[]
  lastTimestamp: BlockTimestamp
  nodePubkey: Uint8Array
  priorVoters: PriorVoters
  rootSlot: number | null
  votes: LandedVote[]
}>

function parseAuthorizedVoter({
  authorizedVoter,
  epoch,
}: AuthorizedVoterRaw): AuthorizedVoter {
  return {
    epoch,
    authorizedVoter: new PublicKey(authorizedVoter),
  }
}

type LandedVote = {
  latency: number
  lockout: Lockout
}

type AuthorizedVoterRaw = Readonly<{
  authorizedVoter: Uint8Array
  epoch: number
}>

type PriorVoters = Readonly<{
  buf: PriorVoterRaw[]
  idx: number
  isEmpty: number
}>

type PriorVoterRaw = Readonly<{
  authorizedPubkey: Uint8Array
  epochOfLastAuthorizedSwitch: number
  targetEpoch: number
}>

function parsePriorVoters({
  authorizedPubkey,
  epochOfLastAuthorizedSwitch,
  targetEpoch,
}: PriorVoterRaw): PriorVoter {
  return {
    authorizedPubkey: new PublicKey(authorizedPubkey),
    epochOfLastAuthorizedSwitch,
    targetEpoch,
  }
}

function getPriorVoters({ buf, idx, isEmpty }: PriorVoters): PriorVoter[] {
  if (isEmpty) {
    return []
  }

  return [
    ...buf.slice(idx + 1).map(parsePriorVoters),
    ...buf.slice(0, idx).map(parsePriorVoters),
  ]
}
