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
  Finality,
  TransactionSignature,
} from '@solana/web3.js'
import { Wallet, instanceOfWallet } from './wallet'
import { serializeInstructionToBase64 } from './txToBase64'
import { ExecutionError } from './error'
import {
  LoggerPlaceholder,
  logDebug,
  logInfo,
  isLevelEnabled,
  checkErrorMessage,
  sleep,
} from '@marinade.finance/ts-common'
import {
  Provider,
  instanceOfProvider,
  instanceOfProviderWithWallet,
  providerPubkey,
} from './provider'

export const TRANSACTION_SAFE_SIZE = 1280 - 40 - 8 - 1 // 1231

export async function transaction(
  connection: Connection | Provider,
  feePayer?: PublicKey | Wallet | Keypair | Signer
): Promise<Transaction> {
  if (feePayer === undefined && instanceOfProvider(connection)) {
    feePayer = providerPubkey(connection)
  }
  if (feePayer === undefined) {
    throw new Error(
      'transaction: feePayer or instance of Provider has to be passed in to ' +
        'find the transaction fee payer'
    )
  }
  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection
  const bh = await connection.getLatestBlockhash()
  feePayer = feePayer instanceof PublicKey ? feePayer : feePayer.publicKey
  return new Transaction({
    feePayer,
    blockhash: bh.blockhash,
    lastValidBlockHeight: bh.lastValidBlockHeight,
  })
}

export type ExecuteTxParams = {
  connection: Connection | Provider
  transaction: Transaction
  signers?: (Wallet | Keypair | Signer)[]
  errMessage: string
  simulate?: boolean
  printOnly?: boolean
  logger?: LoggerPlaceholder
  feePayer?: PublicKey
  sendOpts?: SendOptions
  confirmOpts?: Finality
  computeUnitPrice?: number
  computeUnitLimit?: number
  confirmWaitTime?: number
}

export type ExecuteTxReturnSimulated = {
  response: SimulatedTransactionResponse
}
export type ExecuteTxReturnExecuted = {
  signature: string
  response: VersionedTransactionResponse
}
export type ExecuteTxReturn =
  | ExecuteTxReturnSimulated
  | ExecuteTxReturnExecuted
  | undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isExecuteTxReturn(data: any): data is ExecuteTxReturn {
  return (
    data !== undefined &&
    data !== null &&
    'signature' in data &&
    'transaction' in data
  )
}

export async function partialSign(
  transaction: Transaction | VersionedTransaction,
  signers: (Wallet | Keypair | Signer)[]
) {
  for (const signer of signers) {
    if (instanceOfWallet(signer)) {
      // partial signing by this call, despite the name
      await signer.signTransaction(transaction)
    } else {
      transaction instanceof VersionedTransaction
        ? transaction.sign([signer])
        : transaction.partialSign(signer)
    }
  }
}

export async function executeTx(
  args: Omit<ExecuteTxParams, 'simulate'> & { simulate: true }
): Promise<ExecuteTxReturnSimulated>
export async function executeTx(
  args: Omit<ExecuteTxParams, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly?: false
  }
): Promise<ExecuteTxReturnExecuted>
export async function executeTx(
  args: Omit<ExecuteTxParams, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly: true
  }
): Promise<undefined>
export async function executeTx(
  args: ExecuteTxParams
): Promise<ExecuteTxReturnExecuted>
export async function executeTx({
  connection,
  transaction,
  signers,
  errMessage,
  printOnly,
  logger,
  feePayer,
  sendOpts,
  confirmOpts,
  computeUnitLimit,
  computeUnitPrice,
  confirmWaitTime,
}: ExecuteTxParams): Promise<ExecuteTxReturn>
export async function executeTx({
  connection,
  transaction,
  signers = [],
  errMessage,
  simulate = false,
  printOnly = false,
  logger,
  feePayer,
  sendOpts = {},
  confirmOpts,
  computeUnitLimit,
  computeUnitPrice,
  confirmWaitTime,
}: ExecuteTxParams): Promise<ExecuteTxReturn> {
  let txResponse:
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

  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection

  addComputeBudgetIxes({ transaction, computeUnitLimit, computeUnitPrice })

  if (
    transaction.recentBlockhash === undefined ||
    transaction.lastValidBlockHeight === undefined ||
    transaction.feePayer === undefined
  ) {
    await updateTransactionBlockhash(transaction, connection)
    transaction.feePayer =
      transaction.feePayer ?? feePayer ?? signers[0].publicKey
  }

  await partialSign(transaction, signers)

  let txSignature: string | undefined = undefined
  try {
    if (simulate) {
      logDebug(logger, '[[Simulation mode]]')
      txResponse = (await connection.simulateTransaction(transaction)).value
      logDebug(logger, txResponse)
      if (txResponse.err) {
        throw new SendTransactionError(
          txResponse.err as string,
          txResponse.logs || undefined
        )
      }
    } else if (!printOnly) {
      // retry when not having recent blockhash
      txSignature = await sendRawTransactionWithRetry(
        connection,
        transaction,
        sendOpts
      )
      // Checking if executed
      txResponse = await confirmTransaction(
        connection,
        txSignature,
        confirmOpts,
        logger,
        confirmWaitTime
      )
    }
  } catch (e) {
    throw new ExecutionError({
      txSignature,
      msg: errMessage,
      cause: e as Error,
      logs: (e as SendTransactionError).logs
        ? (e as SendTransactionError).logs
        : undefined,
      transaction: isLevelEnabled(logger, 'debug') ? transaction : undefined,
    })
  }
  if (txResponse === undefined) {
    return undefined
  } else {
    return simulate
      ? { response: txResponse as SimulatedTransactionResponse }
      : {
          response: txResponse as VersionedTransactionResponse,
          signature: txSignature!,
        }
  }
}

export async function updateTransactionBlockhash<
  T extends Transaction | VersionedTransaction,
>(
  transaction: T,
  connection: Connection,
  currentBlockhash?: Readonly<{
    blockhash: string
    lastValidBlockHeight: number
  }>
): Promise<T> {
  currentBlockhash = currentBlockhash ?? (await connection.getLatestBlockhash())
  if (transaction instanceof VersionedTransaction) {
    transaction.message.recentBlockhash = currentBlockhash.blockhash
  } else {
    transaction.lastValidBlockHeight = currentBlockhash.lastValidBlockHeight
    transaction.recentBlockhash = currentBlockhash.blockhash
  }
  return transaction
}

async function sendRawTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  sendOpts?: SendOptions
): Promise<TransactionSignature> {
  try {
    return await connection.sendRawTransaction(
      transaction.serialize(),
      sendOpts
    )
  } catch (e) {
    if (checkErrorMessage(e, 'blockhash not found')) {
      logDebug(
        undefined,
        'Blockhash not found, retrying to update transaction blockhash, reason: ' +
          e
      )
      await updateTransactionBlockhash(transaction, connection)
      return await connection.sendRawTransaction(
        transaction.serialize(),
        sendOpts
      )
    } else {
      throw e
    }
  }
}

export async function confirmTransaction(
  connection: Connection,
  txSig: TransactionSignature,
  confirmOpts?: Finality,
  logger?: LoggerPlaceholder,
  confirmWaitTime = 0
): Promise<VersionedTransactionResponse> {
  const MAX_WAIT_TIME = 10_000
  let confirmFinality: Finality | undefined = confirmOpts
  if (
    confirmFinality === undefined &&
    (connection.commitment === 'finalized' ||
      connection.commitment === 'confirmed')
  ) {
    confirmFinality = connection.commitment
  }
  confirmFinality = confirmFinality || 'confirmed'

  const txSearchConnection = new Connection(connection.rpcEndpoint, {
    commitment: confirmFinality,
  })
  logDebug(
    logger,
    `Waiting to confirm transaction signature: ${txSig} (timeout ~2 minutes)`
  )
  let txRes: VersionedTransactionResponse | null =
    await txSearchConnection.getTransaction(txSig, {
      commitment: confirmFinality,
      maxSupportedTransactionVersion: 0, // TODO: configurable?
    })
  const confirmBlockhash = connection.getLatestBlockhash(confirmFinality)
  while (
    txRes === null &&
    (
      await connection.isBlockhashValid((await confirmBlockhash).blockhash, {
        commitment: confirmFinality,
      })
    ).value
  ) {
    if (confirmWaitTime > 0) {
      confirmWaitTime =
        confirmWaitTime < MAX_WAIT_TIME
          ? (confirmWaitTime += 1000)
          : confirmWaitTime
      await sleep(confirmWaitTime)
    }
    try {
      if (confirmWaitTime > 0) {
        logDebug(logger, `Checking outcome of transaction '${txSig}'`)
      }
      txRes = await txSearchConnection.getTransaction(txSig, {
        commitment: confirmFinality,
        maxSupportedTransactionVersion: 0,
      })
    } catch (e) {
      if (checkErrorMessage(e, 'Too many requests for a specific RPC call')) {
        logDebug(logger, `Error confirming transaction '${txSig}': ` + e)
      }
    }
  }

  if (txRes === null) {
    throw new Error(
      `Transaction ${txSig} not found, failed to get from ${connection.rpcEndpoint}`
    )
  }
  if (txRes.meta?.err) {
    throw new Error(
      `Transaction ${txSig} failure, result: ${JSON.stringify(txRes)}`
    )
  }
  logDebug(logger, 'Transaction signature: ' + txSig)
  logDebug(logger, txRes.meta?.logMessages)
  return txRes
}

export async function executeTxSimple(
  connection: Connection,
  transaction: Transaction,
  signers?: (Wallet | Keypair | Signer)[],
  sendOpts?: SendOptions,
  confirmOpts?: Finality
): Promise<ExecuteTxReturnExecuted | undefined> {
  return await executeTx({
    connection,
    transaction,
    signers,
    sendOpts,
    confirmOpts,
    errMessage: 'Error executing transaction',
    simulate: false,
  })
}

export async function executeTxWithExceededBlockhashRetry(
  txParams: ExecuteTxParams
): Promise<ExecuteTxReturn> {
  try {
    return await executeTx(txParams)
  } catch (e) {
    if (checkErrorMessage(e, 'block height exceeded')) {
      const txSig =
        e instanceof ExecutionError && e.txSignature !== undefined
          ? `${e.txSignature} `
          : ''
      logDebug(
        txParams.logger,
        `Failed to execute transaction ${txSig}` +
          'due to block height exceeded, retrying, ' +
          'original error: ' +
          e
      )
      txParams.transaction.recentBlockhash = undefined
      return await executeTx(txParams)
    } else {
      throw e
    }
  }
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

async function addComputeBudgetIxes({
  transaction,
  computeUnitLimit,
  computeUnitPrice,
}: {
  transaction: Transaction
  computeUnitLimit?: number
  computeUnitPrice?: number
}) {
  if (computeUnitLimit !== undefined && computeUnitLimit >= 0) {
    transaction.add(setComputeUnitLimitIx(computeUnitLimit))
  }
  if (computeUnitPrice !== undefined && computeUnitPrice > 0) {
    transaction.add(setComputeUnitPriceIx(computeUnitPrice))
  }
}

function setComputeUnitLimitIx(units: number): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitLimit({ units })
}

/**
 * Priority fee that is calculated in micro lamports (0.000001 SOL)
 * Every declared CU for the transaction is paid with this additional payment.
 */
function setComputeUnitPriceIx(microLamports: number): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
}

export type TransactionData<T extends Transaction | VersionedTransaction> = {
  transaction: T
  instructions: TransactionInstruction[]
  signers: (Wallet | Keypair | Signer)[]
}

export type SplitAndExecuteTxData = TransactionData<Transaction>

/**
 * Split tx into multiple transactions if it exceeds the transaction size limit.
 */
export async function splitAndExecuteTx(
  args: Omit<ExecuteTxParams, 'simulate'> & { simulate: true }
): Promise<(ExecuteTxReturnSimulated & SplitAndExecuteTxData)[]>
export async function splitAndExecuteTx(
  args: Omit<ExecuteTxParams, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly?: false
  }
): Promise<(ExecuteTxReturnExecuted & SplitAndExecuteTxData)[]>
export async function splitAndExecuteTx(
  args: Omit<ExecuteTxParams, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly: true
  }
): Promise<[]>
export async function splitAndExecuteTx(
  args: ExecuteTxParams
): Promise<(ExecuteTxReturnExecuted & SplitAndExecuteTxData)[]>
export async function splitAndExecuteTx({
  connection,
  transaction,
  errMessage,
  signers = [],
  feePayer,
  simulate = false,
  printOnly = false,
  logger,
  sendOpts = {},
  confirmOpts,
  computeUnitLimit,
  computeUnitPrice,
}: ExecuteTxParams): Promise<(ExecuteTxReturn & SplitAndExecuteTxData)[]> {
  const result: (ExecuteTxReturn & SplitAndExecuteTxData)[] = []
  if (transaction.instructions.length === 0) {
    return result
  }

  if (!simulate && printOnly) {
    // only to print in base64, returning empty array -> no execution
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
  } else {
    feePayer = feePayer || transaction.feePayer
    if (feePayer === undefined && instanceOfProviderWithWallet(connection)) {
      feePayer = connection.wallet.publicKey
      signers.push(connection.wallet)
    }
    if (feePayer === undefined) {
      throw new Error(
        'splitAndExecuteTx: transaction fee payer has to be defined, either in transaction or argument'
      )
    }
    connection = instanceOfProvider(connection)
      ? connection.connection
      : connection
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
    addComputeBudgetIxes({
      transaction: checkingTransaction,
      computeUnitLimit,
      computeUnitPrice,
    })
    let lastValidTransaction = await getLastValidTransaction(
      checkingTransaction,
      blockhash,
      feePayerDefined
    )

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

      // we tried to add the instruction to checkingTransaction
      // when it was already too big, so we need to split it
      if (
        txSize === undefined ||
        txSize + signaturesSize > TRANSACTION_SAFE_SIZE
      ) {
        // size was elapsed, need to split
        transactions.push(lastValidTransaction)
        // nulling data of the checking transaction, but using the latest ix from for cycle
        // as it was kicked-off from the lastValidTransaction
        checkingTransaction = await getTransaction(feePayerDefined, blockhash)
        addComputeBudgetIxes({
          transaction: checkingTransaction,
          computeUnitLimit,
          computeUnitPrice,
        })
        checkingTransaction.add(ix)
      }
      lastValidTransaction = await getLastValidTransaction(
        checkingTransaction,
        blockhash,
        feePayerDefined
      )
    }
    if (lastValidTransaction.instructions.length !== 0) {
      transactions.push(lastValidTransaction)
    }

    let executionCounter = 0
    let priorTransaction: Transaction | undefined = undefined
    for (const transaction of transactions) {
      transaction.recentBlockhash = priorTransaction?.recentBlockhash
      transaction.lastValidBlockHeight = priorTransaction?.lastValidBlockHeight
      const txSigners: (Signer | Wallet)[] = filterSignersForInstruction(
        transaction.instructions,
        signers
      ).filter(s => !s.publicKey.equals(feePayerDefined))
      txSigners.push(feePayerSigner)
      const executeResult = await executeTxWithExceededBlockhashRetry({
        connection,
        transaction,
        errMessage,
        signers: txSigners,
        simulate,
        logger,
        sendOpts,
      })

      executionCounter++
      priorTransaction = transaction
      logDebug(
        logger,
        `Transaction [${
          executeResult && 'signature' in executeResult
            ? executeResult?.signature
            : undefined
        }] ` +
          `${executionCounter}/${transactions.length} (${transaction.instructions.length} instructions) executed`
      )

      if (executeResult !== undefined) {
        result.push({
          ...executeResult,
          transaction,
          instructions: transaction.instructions,
          signers: txSigners,
        })
      }
    }
  }

  return result
}

async function getLastValidTransaction(
  checkingTransaction: Transaction,
  blockhash: Readonly<{
    blockhash: string
    lastValidBlockHeight: number
  }>,
  feePayer: PublicKey
): Promise<Transaction> {
  const lastValidTransaction = await getTransaction(feePayer, blockhash)
  checkingTransaction.instructions.forEach(ix => lastValidTransaction.add(ix))
  return lastValidTransaction
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
