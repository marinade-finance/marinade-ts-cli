import {
  Keypair,
  PublicKey,
  Commitment,
  clusterApiUrl,
  Cluster,
} from '@solana/web3.js'
import expandTilde from 'expand-tilde' // eslint-disable-line node/no-extraneous-import
import { readFile } from 'fs/promises'
import { doWithLock } from '@marinade.finance/ts-common'
import { parseLedgerWallet } from '@marinade.finance/ledger-utils'
import { CliCommandError } from './error'
import { Wallet } from '@marinade.finance/web3js-common'
import { Logger } from 'pino'
import { getContext } from './context'
import { configureLogger } from './pinoLogging'
import { KeypairWallet } from './wallet'

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

export async function parsePubkeyOrKeypair(
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
  logger: Logger
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
  let logger: Logger
  try {
    logger = getContext().logger
  } catch (e) {
    // context logger is not set
    // let's use not fully configured (but still logger) the logger from index.ts
    logger = configureLogger()
  }
  try {
    return await parseWallet(pubkeyOrPathOrLedger, logger)
  } catch (err) {
    return await parsePubkey(pubkeyOrPathOrLedger)
  }
}

export function parseClusterUrl(url: string): string {
  let clusterUrl =
    url === 'd'
      ? 'devnet'
      : url === 't'
      ? 'testnet'
      : url === 'm' || url === 'mainnet'
      ? 'mainnet-beta'
      : url === 'l' || url === 'localnet' || url === 'localhost'
      ? 'http://127.0.0.1:8899'
      : url

  try {
    clusterUrl = clusterApiUrl(clusterUrl as Cluster)
  } catch (e) {
    // ignore
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
