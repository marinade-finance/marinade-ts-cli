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
  logger?: Logger
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
      logWarn(logger, '[[Simulation mode]]')
      result = (await connection.simulateTransaction(transaction)).value
      logDebug(logger, result)
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
      let timeout = 0
      if (connection.commitment === 'processed') {
        txSearchConnection = new Connection(connection.rpcEndpoint, {
          commitment: 'confirmed',
        })
        // TODO: this could be parametrized, max supported version too
        // if commitment was 'processed' for sending we await for 'confirmed'
        timeout = 1000 * 15 // 15 seconds
      }

      let txRes: VersionedTransactionResponse | null =
        await txSearchConnection.getTransaction(txSig, {
          maxSupportedTransactionVersion: 0,
        })
      const startTime = Date.now()
      while (txRes === null && Date.now() - startTime < timeout) {
        txRes = await txSearchConnection.getTransaction(txSig, {
          maxSupportedTransactionVersion: 0,
        })
      }
      if (txRes === null) {
        throw new Error(`Transaction ${txSig} not found`)
      }
      result = txRes
      logDebug(logger, 'Transaction signature: ' + txSig)
      logDebug(logger, txRes.meta?.logMessages)
    }
  } catch (e) {
    throw new CliCommandError({
      msg: errMessage,
      cause: e as Error,
      logs: (e as SendTransactionError).logs
        ? (e as SendTransactionError).logs
        : undefined,
      transaction:
        !logger || logger.isLevelEnabled('debug') ? transaction : undefined,
    })
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logWarn(logger: Logger | undefined, data: any) {
  if (logger) {
    logger.warn(data)
  } else {
    console.log(data)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logDebug(logger: Logger | undefined, data: any) {
  if (logger) {
    logger.debug(data)
  } else {
    console.debug(data)
  }
}

export async function executeTxSimple(
  connection: Connection,
  transaction: Transaction,
  signers?: (Wallet | Keypair | Signer)[]
): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  return await executeTx({
    connection,
    transaction,
    signers,
    errMessage: 'Error executing transaction',
  })
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
