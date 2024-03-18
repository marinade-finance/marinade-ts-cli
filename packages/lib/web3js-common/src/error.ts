import { Transaction, VersionedTransaction } from '@solana/web3.js'

export class ExecutionError extends Error {
  readonly txSignature?: string
  readonly cause?: Error
  readonly logs?: string[]
  readonly transaction?: Transaction | VersionedTransaction

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

  static fromMsg(msg: string): ExecutionError {
    return new ExecutionError({ msg })
  }

  get [Symbol.toStringTag]() {
    return 'ExecutionError'
  }
  static get [Symbol.species]() {
    return ExecutionError
  }
}
