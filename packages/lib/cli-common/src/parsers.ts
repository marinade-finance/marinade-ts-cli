import {
  Keypair,
  PublicKey,
  Commitment,
  clusterApiUrl,
  Cluster,
  Finality,
} from '@solana/web3.js'
import { readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { doWithLock, expandTilde, logDebug } from '@marinade.finance/ts-common'
import { parseLedgerWallet } from '@marinade.finance/ledger-utils'
import { CliCommandError } from './error'
import {
  Wallet,
  KeypairWallet,
  NullWallet,
  pubkey,
} from '@marinade.finance/web3js-common'
import { Logger } from 'pino'
import { getContext } from './context'
import { PINO_CONFIGURED_LOGGER } from './pinoLogging'
import YAML from 'yaml'

export const DEFAULT_CONFIG_PATH = '~/.config/solana/cli/config.yml'
export const DEFAULT_KEYPAIR_PATH = '~/.config/solana/id.json'
export const DEFAULT_CLUSTER_URL = 'http://127.0.0.1:8899'

export async function parsePubkey(pubkeyOrPath: string): Promise<PublicKey> {
  try {
    return await parsePubkeyWithPath(pubkeyOrPath)
  } catch (err) {
    try {
      const keypair = await parseKeypair(pubkeyOrPath)
      return keypair.publicKey
    } catch (err2) {
      return new PublicKey(
        new Uint8Array(JSON.parse(await parseFile(pubkeyOrPath)))
      )
    }
  }
}

export async function parseKeypairOrPubkey(
  pubkeyOrPath: string
): Promise<PublicKey | Keypair> {
  try {
    return await parseKeypair(pubkeyOrPath)
  } catch (err) {
    return await parsePubkey(pubkeyOrPath)
  }
}

export async function parseKeypair(pathOrPrivKey: string): Promise<Keypair> {
  // try if keypair is unit8array
  try {
    const privateKey = new Uint8Array(JSON.parse(pathOrPrivKey))
    if (privateKey.length !== 64) {
      throw new Error('Invalid private key, expecting 64 bytes')
    }
    return Keypair.fromSecretKey(privateKey)
  } catch (err) {
    return Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(await parseFile(pathOrPrivKey)))
    )
  }
}

export async function parseFile(path: string): Promise<string> {
  return await readFile(expandTilde(path), 'utf-8')
}

export function parseFileSync(path: string): string {
  return readFileSync(expandTilde(path), 'utf-8')
}

async function parsePubkeyWithPath(pubkeyOrPath: string): Promise<PublicKey> {
  try {
    return new PublicKey(pubkeyOrPath)
  } catch (err) {
    return new PublicKey(
      new Uint8Array(
        JSON.parse(await readFile(expandTilde(pubkeyOrPath), 'utf-8'))
      )
    )
  }
}

// we don't want an async parsing would try
// to open the same Ledger device twice
const PARSE_SIGNER_LOCK = 'parseSignerLock'

export async function parseWallet(
  pathOrLedger: string,
  logger: Logger | undefined
): Promise<Wallet> {
  let wallet
  try {
    wallet = await doWithLock(PARSE_SIGNER_LOCK, async () =>
      parseLedgerWallet(pathOrLedger, logger)
    )
  } catch (err) {
    throw new CliCommandError({
      commandName: '',
      valueName: '',
      value: '',
      msg: `Failed loading Ledger device [${pathOrLedger}]`,
      cause: err as Error,
    })
  }
  if (wallet) {
    return wallet
  }
  const keypair = await parseKeypair(pathOrLedger)
  return new KeypairWallet(keypair)
}

export async function parseWalletOrPubkey(
  pubkeyOrPathOrLedger: string
): Promise<Wallet | PublicKey> {
  let logger: Logger | undefined = undefined
  try {
    logger = getContext().logger
  } catch (e) {
    // context logger is not set, use default
    logger = PINO_CONFIGURED_LOGGER
  }
  pubkeyOrPathOrLedger = pubkeyOrPathOrLedger.trim()
  try {
    return await parseWallet(pubkeyOrPathOrLedger, logger)
  } catch (err) {
    if (pubkeyOrPathOrLedger.startsWith('usb://')) {
      // ledger
      throw err
    }
    return await parsePubkey(pubkeyOrPathOrLedger)
  }
}

export async function parsePubkeyOrPubkeyFromWallet(
  pubkeyOrPathOrLedger: string
): Promise<PublicKey> {
  return pubkey(await parseWalletOrPubkey(pubkeyOrPathOrLedger))
}

/**
 * --keypair (considered as 'wallet') could be defined or undefined (and default is on parsing).
 * For 'show*' command we don't need a working wallet, so we can use NullWallet.
 * For '--print-only' we don't need a working wallet, so we can use NullWallet.
 * For other commands we need a working wallet, when cannot be parsed then Error.
 */
export async function parseWalletFromOpts(
  keypairArg: string | undefined,
  printOnly: boolean,
  commandArgs: string[],
  logger: Logger,
  defaultKeypair?: string,
  solanaConfigPath?: string
): Promise<Wallet> {
  const wallet = keypairArg
  let walletInterface: Wallet
  try {
    if (wallet) {
      walletInterface = await parseWallet(wallet, logger)
    } else {
      defaultKeypair =
        defaultKeypair ??
        resolveSolanaConfig({ logger, solanaConfigPath }).keypairPath
      walletInterface = await parseWallet(defaultKeypair, logger)
    }
  } catch (err) {
    if (
      commandArgs.find(arg => arg.startsWith('show')) !== undefined ||
      printOnly
    ) {
      // when working with show command it does not matter to use NullWallet
      // for other instructions it could matter as the transaction fees cannot be paid by NullWallet
      // still using NullWallet is ok when one generates only --print-only
      logger.debug(
        `Cannot load --keypair wallet '${
          wallet || defaultKeypair
        }' but it's show or --print-only command, using NullWallet`
      )
      walletInterface = new NullWallet()
    } else {
      const definedMsg =
        wallet !== undefined
          ? `--keypair wallet '${wallet}'`
          : `default keypair path ${defaultKeypair}`
      logger.error(`Failed to use ${definedMsg}, exiting.`)
      throw err
    }
  }
  return walletInterface
}

export function resolveSolanaConfig({
  solanaConfigPath = DEFAULT_CONFIG_PATH,
  defaultKeypair = DEFAULT_KEYPAIR_PATH,
  defaultRpcUrl = DEFAULT_CLUSTER_URL,
  logger,
}: {
  solanaConfigPath?: string
  defaultKeypair?: string
  defaultRpcUrl?: string
  logger?: Logger
}): {
  keypairPath: string
  jsonRpcUrl: string
  commitment?: Commitment
} {
  let configFromFile
  try {
    configFromFile = parseFileSync(solanaConfigPath)
  } catch (err) {
    logDebug(
      logger,
      `Failed to load Solana config file ${solanaConfigPath}: ${err}`
    )
    return {
      keypairPath: defaultKeypair,
      jsonRpcUrl: defaultRpcUrl,
    }
  }

  const configData: {
    json_rpc_url?: string
    websocket_url?: string
    keypair_path?: string
    commitment?: string
  } = YAML.parse(configFromFile)
  let parsedCommitment: Commitment | undefined = undefined
  if (configData.commitment !== undefined) {
    try {
      parsedCommitment = parseCommitment(configData.commitment)
    } catch (err) {
      logDebug(
        logger,
        `Failed to parse commitment ${configData.commitment} ` +
          `from Solana config file ${solanaConfigPath}: ${err}`
      )
    }
  }

  return {
    keypairPath: configData.keypair_path ?? defaultKeypair,
    jsonRpcUrl: configData.json_rpc_url ?? defaultRpcUrl,
    commitment: parsedCommitment,
  }
}

export function parseClusterUrl(
  url: string | undefined,
  solanaConfigPath?: string
): string {
  const localhost = 'http://127.0.0.1:8899'
  let clusterUrl =
    url === 'd'
      ? 'devnet'
      : url === 't'
      ? 'testnet'
      : url === 'm' || url === 'mainnet'
      ? 'mainnet-beta'
      : url === 'l' || url === 'localnet' || url === 'localhost'
      ? localhost
      : url

  try {
    clusterUrl = clusterApiUrl(clusterUrl as Cluster | undefined)
  } catch (e) {
    // ignore
  }
  if (!clusterUrl) {
    clusterUrl = resolveSolanaConfig({ solanaConfigPath }).jsonRpcUrl
  }
  return clusterUrl
}

export function parseCommitment(commitment: string): Commitment {
  if (commitment === 'processed') {
    return 'processed'
  } else if (commitment === 'confirmed') {
    return 'confirmed'
  } else if (commitment === 'finalized') {
    return 'finalized'
  } else if (commitment === 'recent') {
    return 'recent'
  } else if (commitment === 'single') {
    return 'single'
  } else if (commitment === 'singleGossip') {
    return 'singleGossip'
  } else if (commitment === 'root') {
    return 'root'
  } else if (commitment === 'max') {
    return 'max'
  } else {
    throw new Error(
      'Invalid value of --commitment: ' +
        commitment +
        '. Permitted values: processed, confirmed, finalized, recent, single, singleGossip, root, max'
    )
  }
}

export function parseConfirmationFinality(
  confirmationFinality: string
): Finality {
  if (confirmationFinality === 'confirmed') {
    return 'confirmed'
  } else if (confirmationFinality === 'finalized') {
    return 'finalized'
  } else {
    throw new Error(
      'Invalid value of --confirmation-finality: ' +
        confirmationFinality +
        '. Permitted values: confirmed and finalized'
    )
  }
}
