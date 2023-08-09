import { TransactionInstruction, PublicKey } from '@solana/web3.js'
import { serialize } from 'borsh'

// the serialization processing is adapted from SPL Governance SDK Oyster 0.3.28
// see https://github.com/solana-labs/oyster/blob/6a23631ad30fb7761107b8316479c14519217560/packages/governance-sdk/src/governance/serialisation.ts#L247
// the Oyster SDK brings in a lot of dependencies, so we just copy the relevant parts here

export class AccountMetaData {
  pubkey: PublicKey
  isSigner: boolean
  isWritable: boolean

  constructor(args: {
    pubkey: PublicKey
    isSigner: boolean
    isWritable: boolean
  }) {
    this.pubkey = args.pubkey
    this.isSigner = !!args.isSigner
    this.isWritable = !!args.isWritable
  }
}

export class InstructionData {
  programId: PublicKey
  accounts: AccountMetaData[]
  data: Uint8Array

  constructor(args: {
    programId: PublicKey
    accounts: AccountMetaData[]
    data: Uint8Array
  }) {
    this.programId = args.programId
    this.accounts = args.accounts
    this.data = args.data
  }
}

// Serializes sdk instruction into InstructionData and encodes it as base64 which then can be entered into the UI form
export const serializeInstructionToBase64 = (
  instruction: TransactionInstruction
) => {
  const data = createInstructionData(instruction)

  return Buffer.from(serialize(createSchema(), data)).toString('base64')
}

// Converts TransactionInstruction to InstructionData format
export const createInstructionData = (instruction: TransactionInstruction) => {
  return new InstructionData({
    programId: instruction.programId,
    data: instruction.data,
    accounts: instruction.keys.map(
      k =>
        new AccountMetaData({
          pubkey: k.pubkey,
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })
    ),
  })
}

/// Creates serialization schema for structs used for instructions and accounts
function createSchema() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Map<Function, any>([
    [
      InstructionData,
      {
        kind: 'struct',
        fields: [
          ['programId', 'pubkey'],
          ['accounts', [AccountMetaData]],
          ['data', ['u8']],
        ],
      },
    ],
    [
      AccountMetaData,
      {
        kind: 'struct',
        fields: [
          ['pubkey', 'pubkey'],
          ['isSigner', 'u8'],
          ['isWritable', 'u8'],
        ],
      },
    ],
  ])
}
