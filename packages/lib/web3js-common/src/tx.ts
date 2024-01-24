import {
  Connection,
  Transaction,
  VersionedTransactionResponse,
  SimulatedTransactionResponse,
  SendTransactionError,
  Keypair,
  Signer,
  TransactionInstruction,
  TransactionResponse,
  BlockhashWithExpiryBlockHeight,
  PublicKey,
  ComputeBudgetProgram,
  SendOptions,
  VersionedTransaction,
  Commitment,
} from '@solana/web3.js'
import { Wallet, instanceOfWallet } from './wallet'
import { serializeInstructionToBase64 } from './txToBase64'
import { ExecutionError } from './error'
import {
  LoggerPlaceholder,
  logDebug,
  logInfo,
  logWarn,
  isLevelEnabled,
} from '@marinade.finance/ts-common'

export type ConfirmTransactionOptions = {
  commitment?: Commitment
  timeoutMs?: number
}

export async function executeTx({
  connection,
  transaction,
  signers = [],
  errMessage,
  simulate = false,
  printOnly = false,
  logger,
  sendOpts = {},
  confirmOpts = {},
}: {
  connection: Connection
  transaction: Transaction
  signers?: (Wallet | Keypair | Signer)[]
  errMessage: string
  simulate?: boolean
  printOnly?: boolean
  logger?: LoggerPlaceholder
  sendOpts?: SendOptions
  confirmOpts?: ConfirmTransactionOptions
}): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  let result:
    | VersionedTransactionResponse
    | SimulatedTransactionResponse
    | undefined = undefined

  if (printOnly) {
    logInfo(logger, 'Instructions (SPL Gov base64):')
    for (const ix of transaction.instructions) {
      console.log('  ' + serializeInstructionToBase64(ix))
    }
    if (!simulate) {
      return undefined
    }
  }

  const currentBlockhash = await connection.getLatestBlockhash()
  if (
    transaction.recentBlockhash === undefined ||
    transaction.recentBlockhash === undefined ||
    transaction.feePayer === undefined
  ) {
    transaction.lastValidBlockHeight = currentBlockhash.lastValidBlockHeight
    transaction.recentBlockhash = currentBlockhash.blockhash
    transaction.feePayer = transaction.feePayer ?? signers[0].publicKey
  }

  for (const signer of signers) {
    if (instanceOfWallet(signer)) {
      // partial signing by this call
      await signer.signTransaction(transaction)
    } else {
      transaction.partialSign(signer)
    }
  }

  let txSig: string | undefined = undefined
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
      txSig = await connection.sendRawTransaction(
        transaction.serialize(),
        sendOpts
      )
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
          `Transaction ${txSig} failure, result: ${JSON.stringify(res)}`
        )
      }
      let txSearchConnection = connection
      let timeout = 0
      if (confirmOpts) {
        timeout = confirmOpts.timeoutMs || 0
        txSearchConnection = new Connection(connection.rpcEndpoint, {
          commitment: confirmOpts.commitment || connection.commitment,
        })
      } else if (connection.commitment === 'processed') {
        txSearchConnection = new Connection(connection.rpcEndpoint, {
          commitment: 'confirmed',
        })
        timeout = 1000 * 7
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
    throw new ExecutionError({
      msg: txSig ? `${txSig} ` : '' + errMessage,
      cause: e as Error,
      logs: (e as SendTransactionError).logs
        ? (e as SendTransactionError).logs
        : undefined,
      transaction: isLevelEnabled(logger, 'debug') ? transaction : undefined,
    })
  }
  return result
}

export async function executeTxSimple(
  connection: Connection,
  transaction: Transaction,
  signers?: (Wallet | Keypair | Signer)[],
  sendOpts?: SendOptions,
  confirmOpts?: ConfirmTransactionOptions
): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  return await executeTx({
    connection,
    transaction,
    signers,
    sendOpts,
    confirmOpts,
    errMessage: 'Error executing transaction',
  })
}

export async function executeTxFinalized(
  connection: Connection,
  transaction: Transaction,
  signers?: (Wallet | Keypair | Signer)[],
  sendOpts?: SendOptions
): Promise<
  VersionedTransactionResponse | SimulatedTransactionResponse | undefined
> {
  return await executeTx({
    connection,
    transaction,
    signers,
    sendOpts,
    // a blockhash is valid for 150 slots, ~ 60 seconds
    confirmOpts: { commitment: 'finalized', timeoutMs: 70 * 1000 },
    errMessage: 'Error executing transaction',
  })
}

/**
 * Type guard for TransactionResponse and SimulatedTransactionResponse. It does not accept `undefined` as a valid input.
 *
 * @returns true if the input is a SimulatedTransactionResponse, false if it is a TransactionResponse, throws an error if it is undefined
 */
export function isSimulatedTransactionResponse(
  response:
    | TransactionResponse
    | VersionedTransactionResponse
    | SimulatedTransactionResponse
    | undefined
): response is SimulatedTransactionResponse {
  if (response === undefined) {
    throw new Error(
      'internal error: response is undefined, this is not expected for the type guard function'
    )
  }
  return (
    (response as SimulatedTransactionResponse).err !== undefined &&
    (response as SimulatedTransactionResponse).logs !== undefined &&
    (response as SimulatedTransactionResponse).accounts !== undefined &&
    (response as SimulatedTransactionResponse).unitsConsumed !== undefined &&
    (response as SimulatedTransactionResponse).returnData !== undefined
  )
}

/**
 * Verified if object is the versioned transaction
 */
export function isVersionedTransaction(
  transaction: Transaction | VersionedTransaction
): transaction is VersionedTransaction {
  return 'version' in transaction
}

/**
 * @returns signers that are required for the provided instructions
 */
export function filterSignersForInstruction(
  instructions: TransactionInstruction[],
  signers: (Wallet | Keypair | Signer)[],
  feePayer?: PublicKey
): (Wallet | Keypair | Signer)[] {
  const signersRequired = instructions.flatMap(ix =>
    ix.keys.filter(k => k.isSigner).map(k => k.pubkey)
  )
  if (feePayer !== undefined) {
    signersRequired.push(feePayer)
  }
  return signers.filter(s => signersRequired.find(rs => rs.equals(s.publicKey)))
}

async function getTransaction(
  feePayer: PublicKey,
  bh: Readonly<{
    blockhash: string
    lastValidBlockHeight: number
  }>
): Promise<Transaction> {
  return new Transaction({
    feePayer,
    blockhash: bh.blockhash,
    lastValidBlockHeight: bh.lastValidBlockHeight,
  })
}

export const TRANSACTION_SAFE_SIZE = 1280 - 40 - 8 - 1 // 1231

async function addComputeBudgetIx(
  exceedBudget: boolean | undefined,
  tx: Transaction
) {
  if (exceedBudget) {
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_000_000,
      })
    )
  }
}

/**
 * Split tx into multiple transactions if it exceeds the transaction size limit.
 * TODO: this is a bit hacky, we should use a better approach to split the tx
 *       and support VersionedTransactions
 */
export async function splitAndExecuteTx({
  connection,
  transaction,
  errMessage,
  signers = [],
  feePayer,
  simulate = false,
  printOnly = false,
  logger,
  exceedBudget = false,
  sendOpts = {},
  confirmOpts = {},
}: {
  connection: Connection
  transaction: Transaction
  errMessage: string
  signers?: (Wallet | Keypair | Signer)[]
  feePayer?: PublicKey
  simulate?: boolean
  printOnly?: boolean
  logger?: LoggerPlaceholder
  exceedBudget?: boolean
  sendOpts?: SendOptions
  confirmOpts?: ConfirmTransactionOptions
}): Promise<{
  result: VersionedTransactionResponse[] | SimulatedTransactionResponse[] | []
  transactions: Transaction[]
}> {
  const result:
    | VersionedTransactionResponse[]
    | SimulatedTransactionResponse[]
    | [] = []
  const resultTransactions: Transaction[] = []

  // only to print in base64
  if (!simulate && printOnly) {
    await executeTx({
      connection,
      transaction,
      errMessage,
      signers,
      logger,
      simulate,
      printOnly,
      sendOpts,
      confirmOpts,
    })
    resultTransactions.push(transaction)
  } else {
    feePayer = feePayer || transaction.feePayer
    if (feePayer === undefined) {
      throw new Error(
        'splitAndExecuteTx: transaction fee payer has to be defined, either in transaction or argument'
      )
    }
    const uniqueSigners: Map<string, Wallet | Keypair | Signer> = new Map()
    for (const signer of signers) {
      uniqueSigners.set(signer.publicKey.toBase58(), signer)
    }
    signers = Array.from(uniqueSigners.values())
    const feePayerDefined: PublicKey = feePayer
    const feePayerSigner = signers.find(s =>
      s.publicKey.equals(feePayerDefined)
    )
    if (feePayerSigner === undefined) {
      throw new Error(
        'splitAndExecuteTx: transaction fee payer ' +
          feePayerDefined.toBase58() +
          ' has to be defined amongst signers'
      )
    }

    const transactions: Transaction[] = []
    let blockhash: BlockhashWithExpiryBlockHeight
    if (
      transaction.recentBlockhash === undefined ||
      transaction.lastValidBlockHeight === undefined
    ) {
      blockhash = await connection.getLatestBlockhash()
    } else {
      blockhash = {
        blockhash: transaction.recentBlockhash,
        lastValidBlockHeight: transaction.lastValidBlockHeight,
      }
    }
    let checkingTransaction = await getTransaction(feePayerDefined, blockhash)
    let lastValidTransaction = await getTransaction(feePayerDefined, blockhash)
    addComputeBudgetIx(exceedBudget, checkingTransaction)
    for (const ix of transaction.instructions) {
      checkingTransaction.add(ix)
      const filteredSigners = filterSignersForInstruction(
        checkingTransaction.instructions,
        signers,
        feePayerDefined
      )
      const signaturesSize = filteredSigners.length * 64
      let txSize: number | undefined = undefined
      try {
        txSize = checkingTransaction.serialize({
          verifySignatures: false,
          requireAllSignatures: false,
        }).byteLength
      } catch (e) {
        // ignore
        logDebug(logger, 'Transaction size calculation failed: ' + e)
      }

      if (
        txSize === undefined ||
        txSize + signaturesSize > TRANSACTION_SAFE_SIZE
      ) {
        // size was elapsed, need to split
        transactions.push(lastValidTransaction)
        // nulling data of the checking transaction
        checkingTransaction = await getTransaction(feePayerDefined, blockhash)
        addComputeBudgetIx(exceedBudget, checkingTransaction)
        checkingTransaction.add(ix)
      }
      lastValidTransaction = await getTransaction(feePayerDefined, blockhash)
      checkingTransaction.instructions.forEach(ix =>
        lastValidTransaction.add(ix)
      )
    }
    if (lastValidTransaction.instructions.length !== 0) {
      transactions.push(lastValidTransaction)
    }

    // sign all transactions with fee payer at once
    if (instanceOfWallet(feePayerSigner)) {
      // partial signing by this call
      await feePayerSigner.signAllTransactions(transactions)
    } else {
      for (const transaction of transactions) {
        transaction.partialSign(feePayerSigner)
      }
    }

    let executionCounter = 0
    resultTransactions.push(...transactions)
    for (const transaction of transactions) {
      const txSigners: (Signer | Wallet)[] = filterSignersForInstruction(
        transaction.instructions,
        signers
      ).filter(s => !s.publicKey.equals(feePayerDefined))
      const executeResult = await executeTx({
        connection,
        transaction,
        errMessage,
        signers: txSigners,
        logger,
        sendOpts,
      })

      executionCounter++
      logDebug(
        logger,
        `Transaction ${executionCounter}/${transactions.length} ` +
          `(${transaction.instructions.length} instructions) executed`
      )

      if (isSimulatedTransactionResponse(executeResult)) {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(result as SimulatedTransactionResponse[]).push(executeResult)
      } else if (executeResult !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(result as VersionedTransactionResponse[]).push(executeResult)
      }
    }
  }

  return { result, transactions: resultTransactions }
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
