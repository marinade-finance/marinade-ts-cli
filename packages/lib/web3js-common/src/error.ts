import {
  SendTransactionError,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'

export class ExecutionError extends Error {
  readonly txSignature?: string
  readonly cause?: Error
  readonly logs?: string[]
  readonly transaction?: Transaction | VersionedTransaction
  readonly transactionCauseError?: string

  constructor({
    msg,
    txSignature,
    cause,
    logs,
    transaction,
  }: {
    msg?: string
    txSignature?: string
    cause?: Error
    logs?: string[]
    transaction?: Transaction | VersionedTransaction
  }) {
    super(msg)
    this.txSignature = txSignature
    this.cause = cause
    this.logs = logs
    this.transaction = transaction
    this.transactionCauseError = this.extractTransactionCauseError(cause)

    // restore prototype chain
    const actualProto = new.target.prototype
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto)
    } else {
      // eslint-disable-next-line
      (this as any).proto = actualProto
    }
  }

  messageWithCause(): string {
    const causeMessage = this.cause ? '; caused: ' + this.cause.message : ''
    return this.message + causeMessage
  }

  messageWithTransactionError(): string {
    const txCauseErrMessage = this.transactionCauseError
      ? '; transaction error: ' + this.transactionCauseError
      : '; caused: ' + this.cause?.message
    return this.message + txCauseErrMessage
  }

  static fromMsg(msg: string): ExecutionError {
    return new ExecutionError({ msg })
  }

  get [Symbol.toStringTag]() {
    return 'ExecutionError'
  }
  static get [Symbol.species]() {
    return ExecutionError
  }

  private extractTransactionCauseError(
    error: Error | undefined,
  ): string | undefined {
    if (!error || !(error instanceof SendTransactionError)) {
      return undefined
    }

    const text = error.message
    const errorNumberRegex = /Error Number: (\d+)/
    const errorMessageRegex = /Error Message: ([^.]+)/

    const errorNumberMatch = text.match(errorNumberRegex)
    const errorMessageMatch = text.match(errorMessageRegex)

    const result: string | undefined = errorMessageMatch
      ? errorMessageMatch[1].trim()
      : undefined
    return errorNumberMatch
      ? `${result || ''} [err code: ${errorNumberMatch[1]}]`
      : result
  }
}
