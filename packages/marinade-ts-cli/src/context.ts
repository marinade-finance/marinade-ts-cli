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
    skipPreflight,
    confirmationFinality,
    simulate,
    printOnly,
    commandName,
    marinadeDefaults,
  }: {
    connection: Connection
    wallet: AnchorWalletInterface
    logger: Logger
    skipPreflight: boolean
    confirmationFinality: Finality
    simulate: boolean
    printOnly: boolean
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
  walletSigner,
  logger,
  commitment,
  skipPreflight,
  confirmationFinality,
  simulate,
  printOnly,
  command,
}: {
  url: string
  walletSigner: AnchorWalletInterface
  simulate: boolean
  printOnly: boolean
  skipPreflight: boolean
  confirmationFinality: Finality
  commitment: string
  logger: Logger
  command: string
}) {
  const connection = new Connection(
    parseClusterUrl(url),
    parseCommitment(commitment)
  )
  setContext(
    new MarinadeCLIContext({
      connection,
      wallet: walletSigner,
      logger,
      skipPreflight,
      confirmationFinality: parseConfirmationFinality(confirmationFinality),
      simulate,
      printOnly,
      commandName: command,
      marinadeDefaults: new MarinadeConfig(),
    })
  )
}

export function getMarinadeCliContext(): MarinadeCLIContext {
  return getContext() as MarinadeCLIContext
}
