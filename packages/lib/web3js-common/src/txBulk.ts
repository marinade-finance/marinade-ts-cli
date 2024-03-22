import {
  LoggerPlaceholder,
  logError,
  logInfo,
} from '@marinade.finance/ts-common'
import {
  Connection,
  Finality,
  RpcResponseAndContext,
  SendOptions,
  SignatureResult,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  VersionedTransactionResponse,
} from '@solana/web3.js'
import {
  ExecuteTxParams,
  ExecuteTxReturnSimulated,
  TransactionData,
  partialSign,
  splitAndExecuteTx,
} from './tx'
import { instanceOfProvider } from './provider'

export type ExecuteTxReturnExecutedUnknown = {
  signature?: string
  response?: VersionedTransactionResponse
}
export type BulkExecuteTxInput = ExecuteTxParams & { numberOfRetries?: number }
export type BulkExecuteTxSimulatedReturn = TransactionData<Transaction> &
  ExecuteTxReturnSimulated
export type BulkExecuteTxExecutedReturn =
  TransactionData<VersionedTransaction> &
    ExecuteTxReturnExecutedUnknown & { confirmationError?: Error }

export async function splitAndBulkExecuteTx(
  args: Omit<BulkExecuteTxInput, 'simulate'> & { simulate: true }
): Promise<BulkExecuteTxSimulatedReturn[]>
export async function splitAndBulkExecuteTx(
  args: Omit<BulkExecuteTxInput, 'simulate' | 'printOnly'> & { simulate: true }
): Promise<BulkExecuteTxSimulatedReturn[]>
export async function splitAndBulkExecuteTx(
  args: Omit<BulkExecuteTxInput, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly?: false
  }
): Promise<BulkExecuteTxExecutedReturn[]>
export async function splitAndBulkExecuteTx(
  args: BulkExecuteTxInput
): Promise<BulkExecuteTxExecutedReturn[]>
export async function splitAndBulkExecuteTx(
  args: Omit<BulkExecuteTxInput, 'simulate' | 'printOnly'> & {
    simulate?: false
    printOnly: true
  }
): Promise<[]>
export async function splitAndBulkExecuteTx({
  connection,
  transaction,
  errMessage,
  signers = [],
  feePayer,
  simulate,
  printOnly,
  logger,
  sendOpts = {},
  confirmOpts,
  computeUnitLimit,
  computeUnitPrice,
  numberOfRetries = 0,
}: BulkExecuteTxInput): Promise<
  (BulkExecuteTxSimulatedReturn | BulkExecuteTxExecutedReturn)[]
> {
  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection
  const resultSimulated = await splitAndExecuteTx({
    connection,
    transaction,
    errMessage,
    signers,
    feePayer,
    simulate: true,
    printOnly,
    logger,
    sendOpts,
    confirmOpts,
    computeUnitLimit,
    computeUnitPrice,
  })
  if (printOnly || simulate) {
    return resultSimulated
  }

  // changing for VersionedTransaction + nulling any existing response
  const currentBlockhash = await connection.getLatestBlockhash()
  const resultExecuted: BulkExecuteTxExecutedReturn[] = resultSimulated.map(
    r => {
      const messageV0 = new TransactionMessage({
        payerKey: r.transaction.feePayer ?? r.signers[0].publicKey,
        recentBlockhash:
          r.transaction.recentBlockhash ?? currentBlockhash.blockhash,
        instructions: r.transaction.instructions,
      }).compileToV0Message()
      const transaction = new VersionedTransaction(messageV0)
      return {
        ...r,
        signature: undefined,
        response: undefined,
        transaction,
      }
    }
  )

  // let's send to land the transaction on blockchain
  const numberOfSends = numberOfRetries + 1
  for (let i = 1; i <= numberOfSends; i++) {
    try {
      await bulkSend({
        connection,
        logger,
        sendOpts,
        confirmOpts,
        data: resultExecuted,
        retryAttempt: i,
      })
    } catch (e) {
      logError(logger, `Bulk #${i} sending failed with error: ${e}`)
    }
  }

  return resultExecuted
}

// changes promoted to parameter 'data', nothing returned
async function bulkSend({
  connection,
  logger,
  sendOpts,
  confirmOpts,
  data,
  retryAttempt,
}: {
  connection: Connection
  logger: LoggerPlaceholder | undefined
  sendOpts: SendOptions
  confirmOpts: Finality | undefined
} & {
  data: BulkExecuteTxExecutedReturn[]
  retryAttempt: number
}): Promise<void> {
  // updating the recent blockhash of all transactions to be on top
  const workingTransactions: {
    index: number
    transaction: VersionedTransaction
  }[] = []
  const currentBlockhash = await connection.getLatestBlockhash()
  for (const [i, txData] of data.entries()) {
    // we will be sending only transactions that were not sent yet
    if (txData.response === undefined) {
      txData.transaction.message.recentBlockhash = currentBlockhash.blockhash
      await partialSign(txData.transaction, txData.signers)
      workingTransactions.push({ index: i, transaction: txData.transaction })
    }
  }

  logInfo(
    logger,
    `Bulk #${retryAttempt} sending ${workingTransactions.length} transactions`
  )
  const txSendPromises: { promise: Promise<string>; index: number }[] = []
  for (const { index, transaction } of workingTransactions) {
    const promise = connection.sendTransaction(transaction, {
      skipPreflight: true,
      ...sendOpts,
    })
    txSendPromises.push({ index, promise })
  }
  const confirmationPromises: {
    promise: Promise<RpcResponseAndContext<SignatureResult>>
    index: number
  }[] = []
  for (const { index, promise: signaturePromise } of txSendPromises) {
    const signature = await signaturePromise
    data[index].signature = signature
    const promise = connection.confirmTransaction(
      {
        signature,
        blockhash: currentBlockhash.blockhash,
        lastValidBlockHeight: currentBlockhash.lastValidBlockHeight,
      },
      confirmOpts
    )
    confirmationPromises.push({ index, promise })
  }
  const responsePromises: {
    index: number
    promise: Promise<VersionedTransactionResponse | null>
  }[] = []
  for (const { index, promise: confirmationPromise } of confirmationPromises) {
    try {
      // transaction is on blockchain, it can be with error but it was landed
      await confirmationPromise
      if (data[index]?.signature === undefined) {
        throw new Error(
          `Signature is not set but it has to be index: ${index}: ` +
            JSON.stringify(data[index])
        )
      }
      const promise = connection.getTransaction(data[index].signature!, {
        commitment: confirmOpts,
        maxSupportedTransactionVersion: 0,
      })
      responsePromises.push({ index, promise })
    } catch (e) {
      // transaction was not confirmed to be on blockchain
      // by chance still can be landed but we do not care about it
      // and considering it as not landed on chain
      data[index].confirmationError = e as Error
      responsePromises.push({ index, promise: Promise.resolve(null) })
    }
  }
  for (const { index, promise: responsePromise } of responsePromises) {
    const awaitedResponse = await responsePromise
    if (awaitedResponse !== null) {
      data[index].response = awaitedResponse
      data[index].confirmationError = undefined
    }
  }
}
