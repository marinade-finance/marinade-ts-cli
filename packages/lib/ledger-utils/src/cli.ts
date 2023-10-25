import {
  LockedDeviceError,
  TransportError,
  TransportStatusError,
} from '@ledgerhq/errors'
import { CLI_LEDGER_URL_PREFIX, LedgerWallet, Wallet } from './ledger'
import { Logger } from 'pino'

/**
 * Parsing provided argument a ledger url.
 * It consider it ledger url only when the argument starts with 'usb://ledger',
 * otherwise null is returned.
 */
export async function parseLedgerWallet(
  pathOrUrl: string,
  logger: Logger
): Promise<Wallet | null> {
  pathOrUrl = pathOrUrl.trim()

  // trying ledger (https://docs.solana.com/wallet-guide/hardware-wallets/ledger)
  if (pathOrUrl.startsWith(CLI_LEDGER_URL_PREFIX)) {
    try {
      const solanaLedger = await LedgerWallet.instance(pathOrUrl)
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
          'Ledger device seems not being acknowledged to open the ledger manager. ' +
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

  return null
}
