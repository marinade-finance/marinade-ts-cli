import { Connection, Finality } from '@solana/web3.js'
import { Wallet as AnchorWalletInterface } from '@coral-xyz/anchor/dist/cjs/provider'
import { MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import {
  Context,
  parseClusterUrl,
  parseCommitment,
  setContext,
  getContext,
  parseConfirmationFinality,
} from '@marinade.finance/cli-common'
import { Logger } from 'pino'

export class MarinadeCLIContext extends Context {
  readonly connection: Connection
  readonly marinadeDefaults: MarinadeConfig

  constructor({
    connection,
    wallet,
    logger,
    simulate,
    printOnly,
    skipPreflight,
    confirmationFinality,
    commandName,
    marinadeDefaults,
  }: {
    connection: Connection
    wallet: AnchorWalletInterface
    logger: Logger
    simulate: boolean
    printOnly: boolean
    skipPreflight: boolean
    confirmationFinality: Finality
    commandName: string
    marinadeDefaults: MarinadeConfig
  }) {
    super({
      wallet,
      logger,
      skipPreflight,
      confirmationFinality,
      simulate,
      printOnly,
      commandName,
    })
    this.connection = connection
    this.marinadeDefaults = marinadeDefaults
  }
}

export function setMarinadeCLIContext({
  url,
  walletKeypair,
  simulate,
  printOnly,
  skipPreflight,
  commitment,
  confirmationFinality,
  logger,
  command,
}: {
  url: string
  walletKeypair: AnchorWalletInterface
  simulate: boolean
  printOnly: boolean
  skipPreflight: boolean
  commitment: string
  confirmationFinality: Finality
  logger: Logger
  command: string
}) {
  const connection = new Connection(
    parseClusterUrl(url),
    parseCommitment(commitment),
  )
  setContext(
    new MarinadeCLIContext({
      connection,
      wallet: walletKeypair,
      logger,
      simulate,
      printOnly,
      skipPreflight,
      confirmationFinality: parseConfirmationFinality(confirmationFinality),
      commandName: command,
      marinadeDefaults: new MarinadeConfig(),
    }),
  )
}

export function getMarinadeCliContext(): MarinadeCLIContext {
  return getContext() as MarinadeCLIContext
}
