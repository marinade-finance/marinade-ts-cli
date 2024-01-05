import { Connection } from '@solana/web3.js'
import { Wallet as AnchorWalletInterface } from '@coral-xyz/anchor/dist/cjs/provider'
import { Wallet } from '@coral-xyz/anchor'
import { MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import {
  Context,
  parseClusterUrl,
  parseCommitment,
  parseKeypair,
  setContext,
  getContext,
} from '@marinade.finance/cli-common'
import { parseLedgerWallet } from '@marinade.finance/ledger-utils'
import { Logger } from 'pino'

export class MarinadeCLIContext extends Context {
  readonly connection: Connection
  readonly marinadeDefaults: MarinadeConfig

  constructor({
    connection,
    wallet,
    logger,
    skipPreflight,
    simulate,
    printOnly,
    commandName,
    marinadeDefaults,
  }: {
    connection: Connection
    wallet: AnchorWalletInterface
    logger: Logger
    skipPreflight: boolean
    simulate: boolean
    printOnly: boolean
    commandName: string
    marinadeDefaults: MarinadeConfig
  }) {
    super({ wallet, logger, skipPreflight, simulate, printOnly, commandName })
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
  simulate,
  printOnly,
  command,
}: {
  url: string
  walletSigner: AnchorWalletInterface
  simulate: boolean
  printOnly: boolean
  skipPreflight: boolean
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

export async function parseSigner(
  pathOrUrl: string,
  logger: Logger
): Promise<AnchorWalletInterface> {
  const wallet = await parseLedgerWallet(pathOrUrl, logger)
  if (wallet) {
    return wallet
  }
  const keypair = await parseKeypair(pathOrUrl)
  return new Wallet(keypair)
}
