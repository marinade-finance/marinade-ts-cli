import { CLIContext } from '@marinade.finance/cli-common'
import { MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { getContext, setContext } from '@marinade.finance/ts-common'
import {
  parseConfirmationFinality,
  parseCommitment,
  parseClusterUrl,
} from '@marinade.finance/web3js-1x'
import { Connection } from '@solana/web3.js'

import type { Wallet as AnchorWalletInterface } from '@coral-xyz/anchor/dist/cjs/provider'
import type { Wallet } from '@marinade.finance/web3js-1x'
import type { Finality } from '@solana/web3.js'
import type { Logger } from 'pino'

export class MarinadeCLIContext extends CLIContext {
  readonly connection: Connection
  readonly marinadeDefaults: MarinadeConfig
  readonly wallet: Wallet
  readonly skipPreflight: boolean
  readonly confirmationFinality: Finality
  readonly simulate: boolean
  readonly printOnly: boolean

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
      logger,
      commandName,
    })
    this.connection = connection
    this.marinadeDefaults = marinadeDefaults
    this.wallet = wallet
    this.skipPreflight = skipPreflight
    this.confirmationFinality = confirmationFinality
    this.simulate = simulate
    this.printOnly = printOnly
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
  confirmationFinality: string
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
      wallet: walletKeypair,
      logger,
      simulate,
      printOnly,
      skipPreflight,
      confirmationFinality: parseConfirmationFinality(confirmationFinality),
      commandName: command,
      marinadeDefaults: new MarinadeConfig(),
    })
  )
}

export function getMarinadeCliContext(): MarinadeCLIContext {
  return getContext<MarinadeCLIContext>()
}
