import {
  LoggerPlaceholder,
  logDebug,
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
import { ExecutionError } from './error'

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
}: Omit<BulkExecuteTxInput, 'confirmWaitTime'>): Promise<
  (BulkExecuteTxSimulatedReturn | BulkExecuteTxExecutedReturn)[]
> {
  connection = instanceOfProvider(connection)
    ? connection.connection
    : connection

  const resultSimulated: BulkExecuteTxSimulatedReturn[] =
    await splitAndExecuteTx({
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

  let failures: ExecutionError[] = []
  // let's send to land the transaction on blockchain
  const numberOfSends = numberOfRetries + 1
  for (let i = 1; i <= numberOfSends; i++) {
    ;({ failures } = await bulkSend({
      connection,
      logger,
      sendOpts,
      confirmOpts,
      data: resultExecuted,
      retryAttempt: i,
    }))
    if (failures.length === 0) {
      break
    }
  }
  if (failures.length > 0) {
    for (const err of failures) {
      logError(logger, err.messageWithCause())
    }
    throw new Error(
      'splitAndBulkExecuteTx failed with errors, see logs above' +
        `${failures.length} errors of ${resultExecuted.length} transactions`
    )
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
}): Promise<{ failures: ExecutionError[] }> {
  let processed = 0
  const rpcErrors: ExecutionError[] = []
  // const handler = (reason: unknown, promise: Promise<unknown>) => {
  //   logInfo(
  //     logger,
  //     'Unhandled Rejection: ' +
  //       `processed : ${processed}, rpc errors: ${rpcErrors.length}`
  //   )
  //   logDebug(
  //     logger,
  //     'Unhandled Rejection at: Promise ' + `${promise}, reason: ${reason}`
  //   )
  // }
  // process.on('unhandledRejection', handler)

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

  // --- SENDING ---
  logInfo(
    logger,
    `Bulk #${retryAttempt} sending ${workingTransactions.length} transactions`
  )
  processed = 0
  const txSendPromises: { promise: Promise<string>; index: number }[] = []
  for (const { index, transaction } of workingTransactions) {
    const promise = connection.sendTransaction(transaction, {
      skipPreflight: true,
      ...sendOpts,
    })
    promise
      .then(() => {
        txSendPromises.push({ index, promise })
        logInfo(logger, `Transaction at [${index}] sent to blockchain`)
      })
      .catch(e => {
        logInfo(logger, `Transaction at [${index}] failed to send ` + e.message)
        rpcErrors.push(
          new ExecutionError({
            msg: `Transaction at [${index}] failed to be sent to blockchain`,
            cause: e as Error,
            transaction: data[index].transaction,
          })
        )
      })
      .finally(() => {
        processed++
        logInfo(
          logger,
          `Transaction at [${index}] sent ${processed}/${workingTransactions.length}`
        )
      })
  }

  // --- WAITING FOR ALL TO BE SENT ---
  while (processed < workingTransactions.length) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  // await Promise.all(txSendPromises.map(ts => ts.promise))
  logInfo(
    logger,
    `Sent all transactions ${processed}/${workingTransactions.length} [${data.length}]`
  )

  logDebug(logger, `Confirming bulk #${retryAttempt}`)
  // --- CONFIRMING ---
  processed = 0
  const confirmationPromises: {
    promise: Promise<RpcResponseAndContext<SignatureResult>>
    index: number
  }[] = []
  for await (const { index, promise: signaturePromise } of txSendPromises) {
    try {
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

      promise
        .then(() => {
          confirmationPromises.push({ index, promise })
          logInfo(logger, `Transaction at [${index}] confirmed`)
        })
        .catch(e => {
          logInfo(
            logger,
            `Transaction at [${index}] failed to be confirmed ` + e.message
          )
          // managing 'Promise rejection was handled asynchronously' error
          rpcErrors.push(
            new ExecutionError({
              msg: `Transaction '${signature}' at [${index}] timed-out to be confirmed`,
              cause: e as Error,
              transaction: data[index].transaction,
            })
          )
        })
        .finally(() => {
          processed++
          logInfo(
            logger,
            `Transaction at [${index}] confirmed ${processed}/${txSendPromises.length}`
          )
        })
    } catch (e) {
      processed++
      logInfo(
        logger,
        `Try/catch transaction at [${index}] failed to be confirmed ` +
          (e as Error).message +
          `of ${processed}`
      )
      rpcErrors.push(
        new ExecutionError({
          msg: `Transaction at [${index}] failed to be sent to blockchain`,
          cause: e as Error,
          transaction: data[index].transaction,
        })
      )
    }
  }

  // --- WAITING FOR ALL TO BE CONFIRMED ---
  while (processed < txSendPromises.length) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  logInfo(
    logger,
    `Confirmed all transactions ${processed}/${txSendPromises.length} [${data.length}]`
  )

  logDebug(logger, `Getting logs bulk #${retryAttempt}`)
  // --- GETTING LOGS ---
  processed = 0
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
      promise
        .then(r => {
          responsePromises.push({ index, promise })
          logInfo(
            logger,
            `Transaction at [${index}] fetched ` + JSON.stringify(r)
          )
        })
        .catch(e => {
          logInfo(
            logger,
            `Transaction at [${index}] failed to be fetched ` + e.message
          )
          data[index].confirmationError = e as Error
          responsePromises.push({ index, promise: Promise.resolve(null) })
          rpcErrors.push(
            new ExecutionError({
              msg: `Transaction at [${index}] failed to be sent to blockchain`,
              cause: e as Error,
              transaction: data[index].transaction,
            })
          )
        })
        .finally(() => {
          processed++
          logInfo(
            logger,
            `Transaction at [${index}] fetched ${processed}/${confirmationPromises.length}`
          )
        })
    } catch (e) {
      processed++
      logInfo(
        logger,
        `Try/catch transaction at [${index}] failed to be fetched ` +
          (e as Error).message +
          `of ${processed}`
      )
      // transaction was not confirmed to be on blockchain
      // by chance still can be landed but we do not know why we don't care
      // we consider it as not landed on chain
      data[index].confirmationError = e as Error
      responsePromises.push({ index, promise: Promise.resolve(null) })
      rpcErrors.push(
        new ExecutionError({
          msg: `Transaction '${data[index].signature}' at [${index}] failed to be confirmed`,
          cause: e as Error,
          transaction: data[index].transaction,
        })
      )
    }
  }

  // --- WAITING FOR ALL LOGS BEING FETCHED ---
  while (processed < confirmationPromises.length) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  for (const promise of responsePromises.map(r => r.promise))
    promise.catch(() => {})
  logInfo(
    logger,
    `Processed all transactions ${processed}/${confirmationPromises.length} [${data.length}]`
  )

  logDebug(logger, `Retrieving logs bulk #${retryAttempt}`)
  // --- RETRIEVING LOGS PROMISE AND FINISH ---
  for (const { index, promise: responsePromise } of responsePromises) {
    try {
      responsePromise.catch(e => {
        logInfo(
          logger,
          `Transaction at [${index}] failed to retrieve ` + (e as Error).message
        )
        rpcErrors.push(
          new ExecutionError({
            msg: `Transaction ${data[index].signature} at [${index}]  failed to be found on-chain`,
            cause: e as Error,
            transaction: data[index].transaction,
            logs: data[index].response?.meta?.logMessages || undefined,
          })
        )
      })
      const awaitedResponse = await responsePromise
      if (awaitedResponse !== null) {
        data[index].response = awaitedResponse
        data[index].confirmationError = undefined
      }
    } catch (e) {
      logInfo(
        logger,
        `Try/catch transaction at [${index}] failed to retrieve ` +
          (e as Error).message
      )
      rpcErrors.push(
        new ExecutionError({
          msg: `Transaction ${data[index].signature} at [${index}]  failed to be found on-chain`,
          cause: e as Error,
          transaction: data[index].transaction,
          logs: data[index].response?.meta?.logMessages || undefined,
        })
      )
    }
  }

  // process.removeListener('unhandledRejection', handler)
  for (const err of rpcErrors) {
    logDebug(logger, err)
  }
  return { failures: rpcErrors }
}
