#!/usr/bin/env node

/* eslint-disable no-process-exit */
import { Command } from 'commander'
import { parseSigner, setMarinadeCLIContext } from './context'
import { installCommands } from './commands'
import { pino, Logger } from 'pino'

const DEFAULT_KEYPAIR_PATH = '~/.config/solana/id.json'

const pinoAdditionalOptions = process.env.NODE_ENV?.startsWith('prod')
  ? {
      singleLine: true,
      errorLikeObjectKeys: [],
    }
  : {}
const logger: Logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
      ...pinoAdditionalOptions,
    },
  },
  level: 'info',
})

const program = new Command('marinade')

program
  .version('5.1.0')
  .allowExcessArguments(false)
  .option(
    '-u, --url <url-or-moniker>',
    'URL of Solana cluster or ' +
      'moniker (m/mainnet/mainnet-beta, d/devnet, t/testnet)',
    'm'
  )
  .option('--commitment <commitment>', 'Commitment', 'confirmed')
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
  .option('-d, --debug', 'Debug', false)
  .hook('preAction', async (command: Command, action: Command) => {
    if (command.opts().debug) {
      logger.level = 'debug'
    }

    let walletSigner = (await command.opts().keypair) ?? DEFAULT_KEYPAIR_PATH
    walletSigner = await parseSigner(walletSigner, logger)

    setMarinadeCLIContext({
      url: command.opts().url as string,
      walletSigner,
      simulate: Boolean(command.opts().simulate),
      printOnly: Boolean(command.opts().printOnly),
      skipPreflight: Boolean(command.opts().skipPreflight),
      commitment: command.opts().commitment,
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
