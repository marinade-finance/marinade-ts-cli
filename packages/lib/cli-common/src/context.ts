import { Logger } from 'pino'
import { Wallet } from '@marinade.finance/web3js-common'
import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js'

let context: Context | undefined

export function getContext(): Context {
  if (!context) {
    throw new Error('Context not initialized')
  }
  return context
}

export function setContext(newContext: Context) {
  if (context) {
    throw new Error(
      'Context already initialized, context can be initialized only once'
    )
  }
  context = newContext
}

export abstract class Context {
  readonly wallet: Wallet
  readonly logger: Logger
  readonly skipPreflight: boolean
  readonly simulate: boolean
  readonly printOnly: boolean
  readonly commandName: string

  constructor({
    wallet = new NullWallet(),
    logger,
    skipPreflight,
    simulate,
    printOnly,
    commandName,
  }: {
    wallet?: Wallet
    logger: Logger
    skipPreflight: boolean
    simulate: boolean
    printOnly: boolean
    commandName: string
  }) {
    this.commandName = commandName
    this.wallet = wallet
    this.logger = logger
    this.skipPreflight = skipPreflight
    this.simulate = simulate
    this.printOnly = printOnly
  }
}

export class NullWallet implements Wallet {
  readonly publicKey: PublicKey = PublicKey.default

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    return tx
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs
  }
}
