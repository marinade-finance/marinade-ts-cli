import * as anchor from '@coral-xyz/anchor'
import { SuccessfulTxSimulationResponse } from '@coral-xyz/anchor/dist/cjs/utils/rpc'
import { Provider } from '@coral-xyz/anchor'
import {
  Commitment,
  ConfirmOptions,
  Connection,
  PublicKey,
  SendOptions,
  SendTransactionError,
  Signer,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyError(e: any, idl: anchor.Idl, errCode: number) {
  const errorsMap = anchor.parseIdlErrors(idl)
  const errMsg = errorsMap.get(errCode)
  if (errMsg === undefined) {
    throw new Error(`Error ${errCode} not found in IDL`)
  }
  if (e instanceof anchor.ProgramError) {
    expect(e.msg).toStrictEqual(errMsg)
    expect(e.code).toStrictEqual(errCode)
  } else if (e instanceof anchor.AnchorError) {
    expect(e.error.errorMessage).toStrictEqual(errMsg)
    expect(e.error.errorCode.number).toStrictEqual(errCode)
  } else if (e instanceof SendTransactionError) {
    expect(e.logs).toBeDefined()
    expect(e.logs!.find(l => l.indexOf(errMsg) > -1)).toBeDefined()
  } else if (e instanceof Error) {
    expect(e.message).toContain(errCode.toString())
  } else {
    console.error(e)
    throw e
  }
}

export async function transaction(provider: Provider): Promise<Transaction> {
  const bh = await provider.connection.getLatestBlockhash()
  return new Transaction({
    feePayer: provider.publicKey,
    blockhash: bh.blockhash,
    lastValidBlockHeight: bh.lastValidBlockHeight,
  })
}

export class NullAnchorProvider implements Provider {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  publicKey?: PublicKey | undefined

  constructor(public readonly connection: Connection) {
    this.connection = connection
  }

  send?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    opts?: SendOptions | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  sendAndConfirm?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    opts?: ConfirmOptions | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  sendAll?<T extends Transaction | VersionedTransaction>(
    txWithSigners: { tx: T; signers?: Signer[] | undefined }[],
    opts?: ConfirmOptions | undefined
  ): Promise<string[]> {
    throw new Error('Method not implemented.')
  }
  simulate?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    commitment?: Commitment | undefined,
    includeAccounts?: boolean | PublicKey[] | undefined
  ): Promise<SuccessfulTxSimulationResponse> {
    throw new Error('Method not implemented.')
  }
}
