import {
  Connection,
  Transaction,
  VersionedTransactionResponse,
  SimulatedTransactionResponse,
  SendTransactionError,
  Keypair,
  Signer,
} from '@solana/web3.js'
import { Logger } from 'pino'
import { CliCommandError } from './error'
import { Wallet, instanceOfWallet } from './wallet'
import { serializeInstructionToBase64 } from './txToBase64'

export async function executeTx({
  connection,
  transaction,
  signers = [],
  errMessage,
  simulate = false,
  printOnly = false,
  logger,
}: {
  connection: Connection
  transaction: Transaction
  signers?: (Wallet | Keypair | Signer)[]
  errMessage: string
  simulate?: boolean
  printOnly?: boolean
  logger: Logger
}): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  let result:
    | VersionedTransactionResponse
    | SimulatedTransactionResponse
    | undefined = undefined

  if (printOnly) {
    console.log('Instructions:')
    for (const ix of transaction.instructions) {
      console.log('  ' + serializeInstructionToBase64(ix))
    }
    if (!simulate) {
      return undefined
    }
  }

  const currentBlockhash = await connection.getLatestBlockhash()
  transaction.lastValidBlockHeight = currentBlockhash.lastValidBlockHeight
  transaction.recentBlockhash = currentBlockhash.blockhash
  transaction.feePayer = transaction.feePayer ?? signers[0].publicKey

  for (const signer of signers) {
    if (instanceOfWallet(signer)) {
      await signer.signTransaction(transaction) // partial signing by this call
    } else {
      transaction.partialSign(signer)
    }
  }

  try {
    if (simulate) {
      logger.warn('[[Simulation mode]]')
      result = (await connection.simulateTransaction(transaction)).value
      logger.debug(result)
      if (result.err) {
        throw new SendTransactionError(
          result.err as string,
          result.logs || undefined
        )
      }
    } else if (!printOnly) {
      const txSig = await connection.sendRawTransaction(transaction.serialize())
      const res = await connection.confirmTransaction(
        {
          signature: txSig,
          blockhash: currentBlockhash.blockhash,
          lastValidBlockHeight: currentBlockhash.lastValidBlockHeight,
        },
        connection.commitment
      )
      if (res.value.err) {
        throw new Error(
          `Failure confirming transaction ${txSig}, confirm result: ${res}`
        )
      }
      let txSearchConnection = connection
      if (connection.commitment === 'processed') {
        txSearchConnection = new Connection(connection.rpcEndpoint, {
          commitment: 'confirmed',
        })
      }
      const txRes = await txSearchConnection.getTransaction(txSig)
      if (txRes === null) {
        throw new Error(`Transaction ${txSig} not found`)
      }
      result = txRes
      logger.debug('Transaction signature: %s', txSig)
      logger.debug(txRes.meta?.logMessages)
    }
  } catch (e) {
    throw new CliCommandError({
      msg: errMessage,
      cause: e as Error,
      logs: (e as SendTransactionError).logs
        ? (e as SendTransactionError).logs
        : undefined,
      transaction: logger.isLevelEnabled('debug') ? transaction : undefined,
    })
  }
  return result
}

/**
 * Returns a string representation Transaction object.
 * As of
 * https://github.com/saber-hq/saber-common/blob/v1.14.11/packages/solana-contrib/src/transaction/TransactionEnvelope.ts#L420
 */
export function debugStr(transaction: Transaction): string {
  return [
    '=> Instructions',
    transaction.instructions
      .map((ser, i) => {
        return [
          `Instruction ${i}: ${ser.programId.toString()}`,
          ...ser.keys.map(
            (k, i) =>
              `  [${i}] ${k.pubkey.toString()} ${k.isWritable ? '(mut)' : ''} ${
                k.isSigner ? '(signer)' : ''
              }`
          ),
          `  Data (base64): ${ser.data.toString('base64')}`,
        ].join('\n')
      })
      .join('\n'),
    '=> Signers',
    transaction.signatures.map(sg => sg.publicKey.toString()).join('\n'),
  ].join('\n')
}
