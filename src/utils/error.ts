import { format } from 'util'
import { useContext } from '../context'
import { Transaction, VersionedTransaction } from '@solana/web3.js'

export class CliCommandError extends Error {
  readonly cause?: Error
  readonly logs?: string[]
  readonly transaction?: Transaction | VersionedTransaction

  constructor({
    valueName,
    value,
    msg,
    cause,
    logs,
    transaction,
  }: {
    valueName?: string
    value?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    msg: string
    cause?: Error
    logs?: string[]
    transaction?: Transaction | VersionedTransaction
  }) {
    const { command } = useContext()
    let errorMessage
    if (valueName) {
      errorMessage = format('%s[%s=%s]: %s', command, valueName, value, msg)
    } else {
      errorMessage = format('%s:%s', command, msg)
    }
    super(errorMessage)
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

  get [Symbol.toStringTag]() {
    return 'CliCommandError'
  }
  static get [Symbol.species]() {
    return CliCommandError
  }
}
