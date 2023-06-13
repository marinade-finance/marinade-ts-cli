import { Wallet } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair, PublicKey } from '@solana/web3.js'
import expandTilde from 'expand-tilde'
import { readFile } from 'fs/promises'
import { CLI_LEDGER_URL_PREFIX, SolanaLedger } from './ledger'
import {
  LockedDeviceError,
  TransportError,
  TransportStatusError,
} from '@ledgerhq/errors'
import { Logger } from 'pino'

export async function parsePubkey(pubkeyOrPath: string): Promise<PublicKey> {
  try {
    return new PublicKey(pubkeyOrPath)
  } catch (err) {
    const keypair = await parseKeypair(pubkeyOrPath)
    return keypair.publicKey
  }
}

export async function parsePubkeyOrSigner(
  pubkeyOrPath: string,
  logger: Logger
): Promise<PublicKey | Wallet | SolanaLedger> {
  try {
    return new PublicKey(pubkeyOrPath)
  } catch (err) {
    return await parseSigner(pubkeyOrPath, logger)
  }
}

/**
 * Parsing provided argument as either a path to keypair or a ledger url or derived path.
 */
export async function parseSigner(
  pathOrUrl: string,
  logger: Logger
): Promise<Wallet | SolanaLedger> {
  pathOrUrl = pathOrUrl.trim()

  // trying ledger (https://docs.solana.com/wallet-guide/hardware-wallets/ledger)
  if (pathOrUrl.startsWith(CLI_LEDGER_URL_PREFIX)) {
    try {
      const solanaLedger = await SolanaLedger.instance(pathOrUrl)
      logger.debug(
        'Successfully connected to Ledger device of key %s',
        solanaLedger.publicKey.toBase58()
      )
      return solanaLedger
    } catch (e) {
      if (e instanceof TransportStatusError && 'statusCode' in e) {
        if (e.statusCode === 0x6d02) {
          logger.error(
            'Ledger device Solana application is not activated. ' +
              'Please, enter the Solana app on your ledger device first.'
          )
        } else if (e.statusCode === 0x6808) {
          logger.error(
            'Solana application does not permit blind signatures. ' +
              'Please, permit it in the Solana app settings at the ledger device first.'
          )
        }
      } else if (
        e instanceof TransportError &&
        e.message.includes('Invalid channel')
      ) {
        logger.error(
          'Ledger device seems not being aknowledged to open the ledger manager. ' +
            'Please, open ledger manager first on your device.'
        )
      } else if (e instanceof LockedDeviceError) {
        logger.error('Ledger device is locked. ' + 'Please, unlock it first.')
      } else {
        logger.error(`Failed to connect to Ledger device of key ${pathOrUrl}`)
      }
      throw e
    }
  }

  // parsing path
  const keypair = await parseKeypair(pathOrUrl)
  const wallet = new NodeWallet(keypair)
  return wallet
}

// adapted from https://github.com/marinade-finance/solana-js-utils/tree/main/packages/solana-cli-utils
async function parseKeypair(path: string): Promise<Keypair> {
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(await readFile(expandTilde(path), 'utf-8')))
  )
}
