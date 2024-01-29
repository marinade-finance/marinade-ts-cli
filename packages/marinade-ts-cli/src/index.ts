#!/usr/bin/env node

/* eslint-disable no-process-exit */
import { Command } from 'commander'
import { setMarinadeCLIContext } from './context'
import { installCommands } from './commands'
import { Logger } from 'pino'
import {
  configureLogger,
  parseWalletFromOpts,
} from '@marinade.finance/cli-common'

const DEFAULT_KEYPAIR_PATH = '~/.config/solana/id.json'
const logger: Logger = configureLogger()

const program = new Command('marinade')
program
  .version('5.1.2')
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
      command.opts().keypair,
      printOnly,
      command.args,
      logger
    )

    setMarinadeCLIContext({
      url: command.opts().url as string,
      walletKeypair,
      simulate: Boolean(command.opts().simulate),
      printOnly: Boolean(command.opts().printOnly),
      skipPreflight: Boolean(command.opts().skipPreflight),
      commitment: command.opts().commitment,
      confirmationFinality: command.opts().confirmationFinality,
      logger,
      command: action.name(),
    })
  })

installCommands(program)

program.parseAsync(process.argv).then(
  () => process.exit(),
  (err: unknown) => {
    logger.error(err)
    process.exit(1)
  }
)
