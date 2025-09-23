#!/usr/bin/env node

import { pinoConfiguration } from '@marinade.finance/ts-common'
import {
  ExecutionError,
  parseWalletFromOpts,
} from '@marinade.finance/web3js-1x'
import { Command } from 'commander'
import pino from 'pino'

import { installCommands } from './commands'
import { setMarinadeCLIContext } from './context'

const DEFAULT_KEYPAIR_PATH = '~/.config/solana/id.json'
export const logger = pino(pinoConfiguration('info'), pino.destination())
logger.level = 'debug'

const program = new Command('marinade')
program
  .version('5.1.9')
  .allowExcessArguments(false)
  .option(
    '-u, --url <url-or-moniker>',
    'URL of Solana cluster or ' +
      'moniker (m/mainnet/mainnet-beta, d/devnet, t/testnet, l/localhost)',
    'mainnet'
  )
  .option(
    '-k, --keypair <keypair-or-ledger>',
    'Wallet keypair (path or ledger url in format usb://ledger/[<pubkey>][?key=<derivedPath>]) ' +
      ` (default: ${DEFAULT_KEYPAIR_PATH})`
  )
  .option('-s, --simulate', 'Simulate', false)
  .option(
    '-p, --print-only',
    'Print only mode, no execution, instructions are printed in base64 to output. ' +
      'This can be used for placing the admin commands to SPL Governance UI by hand.',
    false
  )
  .option(
    '--skip-preflight',
    'setting transaction execution flag "skip-preflight"',
    false
  )
  .option('--commitment <commitment>', 'Commitment', 'confirmed')
  .option(
    '--confirmation-finality <finality>',
    'Confirmation finality',
    'finalized'
  )
  .option('-d, --debug', 'Debug', false)
  .option('-v, --verbose', 'Verbose (the same as --debug)', false)
  .hook('preAction', async (command: Command, action: Command) => {
    if (command.opts().debug || command.opts().verbose) {
      logger.level = 'debug'
    }

    const printOnly = Boolean(command.opts().printOnly)
    const walletKeypair = await parseWalletFromOpts(
      command.opts().keypair as string | undefined,
      printOnly,
      command.args,
      logger
    )

    setMarinadeCLIContext({
      url: String(command.opts().url),
      walletKeypair,
      simulate: Boolean(command.opts().simulate),
      printOnly: Boolean(command.opts().printOnly),
      skipPreflight: Boolean(command.opts().skipPreflight),
      commitment: String(command.opts().commitment),
      confirmationFinality: String(command.opts().confirmationFinality),
      logger,
      command: action.name(),
    })
  })

installCommands(program)

program.parseAsync(process.argv).then(
  () => {
    logger.debug({ resolution: 'Success', args: process.argv })
  },
  (err: Error) => {
    logger.error(
      err instanceof ExecutionError
        ? err.messageWithTransactionError()
        : err.message
    )
    logger.debug({ resolution: 'Failure', err, args: process.argv })
    process.exitCode = 1
  }
)
