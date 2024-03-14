import { Logger } from 'pino'
import { Wallet, NullWallet } from '@marinade.finance/web3js-common'
import { Finality } from '@solana/web3.js'

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
  readonly confirmationFinality: Finality
  readonly computeUnitPrice: number
  readonly simulate: boolean
  readonly printOnly: boolean
  readonly commandName: string

  constructor({
    wallet = new NullWallet(),
    logger,
    skipPreflight,
    confirmationFinality = 'finalized',
    computeUnitPrice = 0,
    simulate,
    printOnly,
    commandName,
  }: {
    wallet?: Wallet
    logger: Logger
    skipPreflight: boolean
    confirmationFinality?: Finality
    computeUnitPrice?: number
    simulate: boolean
    printOnly: boolean
    commandName: string
  }) {
    this.commandName = commandName
    this.wallet = wallet
    this.logger = logger
    this.skipPreflight = skipPreflight
    this.confirmationFinality = confirmationFinality
    this.computeUnitPrice = computeUnitPrice
    this.simulate = simulate
    this.printOnly = printOnly
  }
}
