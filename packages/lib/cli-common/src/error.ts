import { format } from 'util'
import { getContext } from './context'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { ExecutionError } from '@marinade.finance/web3js-common'

export class CliCommandError extends ExecutionError {
  constructor({
    commandName,
    valueName,
    value,
    msg,
    cause,
    logs,
    transaction,
  }: {
    commandName?: string
    valueName?: string
    value?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    msg: string
    cause?: Error
    logs?: string[]
    transaction?: Transaction | VersionedTransaction
  }) {
    if (commandName === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-extra-semi
      ;({ commandName } = getContext())
    }
    let errorMessage: string
    if (valueName) {
      errorMessage = format(
        '%s [%s=%s]: %s',
        commandName,
        valueName,
        value,
        msg,
      )
    } else {
      errorMessage = format('%s: %s', commandName, msg)
    }
    super({ msg: errorMessage, cause, logs, transaction })
  }

  static fromMsg(msg: string): CliCommandError {
    return new CliCommandError({ msg })
  }
}
