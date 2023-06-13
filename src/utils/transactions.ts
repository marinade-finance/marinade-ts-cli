import { serializeInstructionToBase64 } from '@solana/spl-governance'
import { Wallet } from '@coral-xyz/anchor'
import { SolanaLedger } from './ledger'
import {
  Connection,
  Transaction,
  VersionedTransactionResponse,
  SimulatedTransactionResponse,
  SendTransactionError,
  Keypair,
} from '@solana/web3.js'
import { Logger } from 'pino'
import { CliCommandError } from './error'

export async function executeTx({
  connection,
  transaction,
  signers,
  errMessage,
  simulate = false,
  printOnly = false,
  logger,
}: {
  connection: Connection
  transaction: Transaction
  signers: (SolanaLedger | Wallet | Keypair)[]
  errMessage: string
  simulate?: boolean
  printOnly?: boolean
  logger: Logger
}): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  let result = undefined

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
    if (signer instanceof SolanaLedger) {
      const message = transaction.compileMessage()
      const ledgerSignature = await signer.signMessage(message)
      transaction.addSignature(signer.publicKey, ledgerSignature)
    } else if (signer instanceof Wallet) {
      // NOTE: Anchor NodeWallet does partial signing by this call
      await signer.signTransaction(transaction)
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
      const txRes = await connection.getTransaction(txSig, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: undefined,
      })
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
      logs: e instanceof SendTransactionError ? e.logs : undefined,
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
