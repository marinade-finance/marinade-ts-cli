import {
  LockedDeviceError,
  TransportError,
  TransportStatusError,
} from '@ledgerhq/errors'
import { CLI_LEDGER_URL_PREFIX, LedgerWallet, Wallet } from './ledger'
import {
  LoggerPlaceholder,
  logError,
  logDebug,
} from '@marinade.finance/ts-common'

/**
 * Parsing provided argument as a ledger url.
 * It considers it ledger url only when the argument starts with 'usb://ledger',
 * otherwise null is returned.
 */
export async function parseLedgerWallet(
  pathOrUrl: string,
  logger?: LoggerPlaceholder
): Promise<Wallet | null> {
  pathOrUrl = pathOrUrl.trim()

  // trying ledger (https://docs.solana.com/wallet-guide/hardware-wallets/ledger)
  if (pathOrUrl.startsWith(CLI_LEDGER_URL_PREFIX)) {
    try {
      const solanaLedger = await LedgerWallet.instance(pathOrUrl, logger)
      logDebug(
        logger,
        `Successfully connected to Ledger device of key ${solanaLedger.publicKey.toBase58()}`
      )
      return solanaLedger
    } catch (e) {
      if (e instanceof TransportStatusError && 'statusCode' in e) {
        if (e.statusCode === 0x6d02) {
          logError(
            logger,
            `Ledger device [${pathOrUrl}] ` +
              ': Solana application is not opened. ' +
              'Please, enter the Solana app on your ledger device first.'
          )
        } else if (e.statusCode === 0x6808) {
          logError(
            logger,
            'Solana application does not permit blind signatures. ' +
              'Please, permit it in the Solana app settings at the ledger device first.'
          )
        } else if (e.statusCode === 0x5515) {
          logError(
            logger,
            `Ledger device [${pathOrUrl}] is locked. ` +
              'Please, unlock it first.'
          )
        }
      } else if (
        e instanceof TransportError &&
        e.message.includes('Invalid channel')
      ) {
        logError(
          logger,
          `Ledger device  [${pathOrUrl}] seems not being acknowledged to have opened the manager. ` +
            'Please, open ledger manager first on your device.'
        )
      } else if (e instanceof LockedDeviceError) {
        logError(
          logger,
          `Ledger device [${pathOrUrl}] is locked. ` +
            'Please, unlock it first.'
        )
      } else if (
        e instanceof Error &&
        e.message.includes('read from a closed HID')
      ) {
        logError(
          logger,
          `Ledger device [${pathOrUrl}] ` +
            'cannot be open, it seems to be closed. Ensure no other program uses it.'
        )
      } else {
        logError(logger, `Failed to connect to Ledger device [${pathOrUrl}]`)
      }
      throw e
    }
  }

  return null
}
