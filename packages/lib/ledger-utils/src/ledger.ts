import Solana from '@ledgerhq/hw-app-solana'
import TransportNodeHid, {
  getDevices,
} from '@ledgerhq/hw-transport-node-hid-noevents'
import {
  MessageV0,
  PublicKey,
  Message,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import { generateAllCombinations } from './utils'
import {
  LoggerPlaceholder,
  logDebug,
  logInfo,
  scheduleOnExit,
} from '@marinade.finance/ts-common'

export const CLI_LEDGER_URL_PREFIX = 'usb://ledger'
export const SOLANA_LEDGER_BIP44_BASE_PATH = "44'/501'"
export const SOLANA_LEDGER_BIP44_BASE_REGEXP = /^44[']{0,1}\/501[']{0,1}\//
export const DEFAULT_DERIVATION_PATH = SOLANA_LEDGER_BIP44_BASE_PATH

const IN_LIB_TRANSPORT_CACHE: Map<string, TransportNodeHid> = new Map()

/**
 * Wallet interface for objects that can be used to sign provider transactions.
 * The interface is compatible with @coral-xyz/anchor/dist/cjs/provider in version 0.28.0
 * See https://github.com/coral-xyz/anchor/blob/v0.28.0/ts/packages/anchor/src/provider.ts#L344
 *
 * This intentionally duplicates the interface from packages/lib/web3js-common/src/wallet.ts
 * as the `ledger-utils` is meant not to be in dependency of `web3js-common`.
 */
export interface Wallet {
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>
  publicKey: PublicKey
}

export class LedgerWallet implements Wallet {
  /**
   * "Constructor" of Solana Ledger to be opened and worked as a Wallet.
   * From ledger url in format of usb://ledger[/<pubkey>[?key=<number>]
   * creates wrapper class around Solana ledger device from '@ledgerhq/hw-app-solana' package.
   */
  static async instance(
    ledgerUrl = '0',
    logger: LoggerPlaceholder | undefined = undefined
  ): Promise<LedgerWallet> {
    // parsedPubkey could be undefined when not provided in url string
    const { parsedPubkey, parsedDerivedPath } = parseLedgerUrl(ledgerUrl)

    const { api, pubkey, derivedPath } = await LedgerWallet.getSolanaApi(
      parsedPubkey,
      parsedDerivedPath,
      logger
    )
    return new LedgerWallet(api, derivedPath, pubkey)
  }

  private constructor(
    public readonly solanaApi: Solana,
    public readonly derivedPath: string,
    public readonly publicKey: PublicKey
  ) {}

  public async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    let message: Message | MessageV0
    if (tx instanceof Transaction) {
      message = tx.compileMessage()
    } else {
      message = tx.message
    }
    const signature = await this.signMessage(message)
    tx.addSignature(this.publicKey, signature)
    return tx
  }

  public async signAllTransactions<
    T extends Transaction | VersionedTransaction,
  >(txs: T[]): Promise<T[]> {
    const signedTxs: T[] = []
    for (const tx of txs) {
      signedTxs.push(await this.signTransaction(tx))
    }
    return signedTxs
  }

  /**
   * Based on the provided pubkey and derived path
   * it tries to match the ledger device and returns back the Solana API.
   * If pubkey is undefined, it takes the first ledger device.
   *
   * When the `heuristicDepth` and `heuristicWide` are provided,
   * then the derivation path will be searched through the space of all combinations
   * of the provided depth and wide. E.g., when the depth is 10 and wide is 3,
   * then the derivation path will be searched from `44'/501'`, through `44'/501'/0 until `44'/501'/10/10/10`.
   */
  private static async getSolanaApi(
    pubkey: PublicKey | undefined,
    derivedPath: string,
    logger: LoggerPlaceholder | undefined = undefined,
    heuristicDepth: number | undefined = 10,
    heuristicWide: number | undefined = 3
  ): Promise<{ api: Solana; derivedPath: string; pubkey: PublicKey }> {
    const ledgerDevices = getDevices()
    if (ledgerDevices.length === 0) {
      throw new Error('No ledger device found')
    }

    let transport: TransportNodeHid | undefined = undefined
    if (pubkey === undefined) {
      // we don't know where to search for the derived path and thus taking first device
      // when pubkey is defined we search all available devices to match the derived path with the pubkey
      const firstDevicePath = ledgerDevices[0].path
      transport = (await openTransports(firstDevicePath))[0]
    } else {
      const openedTransports = await openTransports(...ledgerDevices)
      // if derived path is provided let's check if matches the pubkey
      for (const openedTransport of openedTransports) {
        const solanaApi = new Solana(openedTransport)
        const ledgerPubkey = await getPublicKey(solanaApi, derivedPath)
        if (ledgerPubkey.equals(pubkey)) {
          transport = openedTransport
          break // the found transport is the one we need
        }
      }
      if (transport === undefined) {
        logInfo(
          logger,
          `Public key ${pubkey.toBase58()} has not been found at the default or provided ` +
            `derivation path ${derivedPath}. Going to search, will take a while...`
        )
        const { depth, wide } = getHeuristicDepthAndWide(
          derivedPath,
          heuristicDepth,
          heuristicWide
        )
        const heuristicsCombinations: number[][] = generateAllCombinations(
          depth,
          wide
        )
        for (const openedTransport of openedTransports) {
          const solanaApi = new Solana(openedTransport)
          for (const combination of heuristicsCombinations) {
            const strCombination = combination.map(v => v.toString())
            strCombination.unshift(SOLANA_LEDGER_BIP44_BASE_PATH)
            const heuristicDerivedPath = strCombination.join('/')
            logDebug(logger, `search loop: ${heuristicDerivedPath}`)
            const ledgerPubkey = await getPublicKey(
              solanaApi,
              heuristicDerivedPath
            )
            if (ledgerPubkey.equals(pubkey)) {
              transport = openedTransport
              derivedPath = heuristicDerivedPath
              logInfo(
                logger,
                `Using derived path ${derivedPath}, pubkey ${pubkey.toBase58()}`
              )
              break // we found the transport
            }
          }
          if (transport !== undefined) {
            break // break out to the outer loop; we found the transport
          }
        }
      }
    }

    if (transport === undefined) {
      throw new Error(
        'Available ledger devices does not provide pubkey ' +
          `'${pubkey?.toBase58()}' for derivation path '${derivedPath}'`
      )
    }

    const api = new Solana(transport)
    pubkey = await getPublicKey(api, derivedPath)
    return { api, derivedPath, pubkey }
  }

  /**
   * Signing versioned transaction message with ledger
   * and returns back the signature that's to be included into versioned transaction creation.
   * ```ts
   * new VersionedTransaction(
   *   message,
   *   [ signature ]
   * )
   * ```
   */
  private async signMessage(message: MessageV0 | Message): Promise<Buffer> {
    console.log(
      'signing message',
      this.derivedPath,
      (await getPublicKey(this.solanaApi, this.derivedPath)).toBase58()
    )
    const { signature } = await this.solanaApi.signTransaction(
      this.derivedPath,
      Buffer.from(message.serialize())
    )
    return signature
  }
}

/**
 * From provided Solana API and derived path
 * it returns the public key of the derived path.
 */
export async function getPublicKey(
  solanaApi: Solana,
  derivedPath: string
): Promise<PublicKey> {
  const { address: bufAddress } = await solanaApi.getAddress(derivedPath)
  return new PublicKey(bufAddress)
}

/**
 * Parsing string as ledger url that could be in format of url or derivation path.
 * Some of the examples (trying to be compatible with solana cli https://github.com/solana-labs/solana/blob/v1.14.19/clap-utils/src/keypair.rs#L613)
 * Derivation path consists of the "44'" part that signifies the BIP44 standard, and the "501'" part that signifies the Solana's BIP44 coin type.
 *
 * - `usb://ledger` - taking first device and using solana default derivation path 44/501
 * - `usb://ledger?key=0/1` - taking first device and using solana derivation path 44/501/0/1
 * - `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd` - searching of all ledger devices where solana default derivation path 44/501/0/0 will result in pubkey 9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd
 * - `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd?key=0/1` - searching of all ledger devices where solana derivation path 44/501/0/1 will result in pubkey 9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd
 */
export function parseLedgerUrl(ledgerUrl: string): {
  parsedPubkey: PublicKey | undefined
  parsedDerivedPath: string
} {
  ledgerUrl = ledgerUrl.trim()
  if (!ledgerUrl.startsWith(CLI_LEDGER_URL_PREFIX)) {
    throw new Error(
      `Invalid ledger url ${ledgerUrl}. Expected url started with "usb://ledger".`
    )
  }
  let parsedPubkey: PublicKey | undefined
  let parsedDerivedPath: string

  // removal of the prefix + optional slash
  const ledgerUrlRegexp = new RegExp(CLI_LEDGER_URL_PREFIX + '/?')
  ledgerUrl = ledgerUrl.replace(ledgerUrlRegexp, '')

  const parsePubkey = function (pubkey: string): PublicKey | undefined {
    if (pubkey === '') {
      return undefined
    } else {
      try {
        return new PublicKey(parts[0])
      } catch (e) {
        throw new Error(
          'Failed to parse pubkey from ledger url ' +
            ledgerUrl +
            `. Expecting the ${parts[0]} being pubkey, error: ${e}`
        )
      }
    }
  }

  // checking existence of ?key= part
  const parts = ledgerUrl.split('?key=')
  if (parts.length === 1) {
    //case: usb://ledger/<pubkey>
    parsedPubkey = parsePubkey(parts[0])
    parsedDerivedPath = DEFAULT_DERIVATION_PATH
  } else if (parts.length === 2) {
    //case: usb://ledger/<pubkey>?key=<number>
    parsedPubkey = parsePubkey(parts[0])
    const key = parts[1]
    if (key === '') {
      // case: usb://ledger/<pubkey>?key=
      parsedDerivedPath = DEFAULT_DERIVATION_PATH
    } else if (SOLANA_LEDGER_BIP44_BASE_REGEXP.test(key)) {
      // case: usb://ledger/<pubkey>?key=44'/501'/<number>
      parsedDerivedPath = key
    } else {
      // case: usb://ledger/<pubkey>?key=<number>
      const keyTrimmed = key.replace(/^\//, '')
      parsedDerivedPath = SOLANA_LEDGER_BIP44_BASE_PATH + '/' + keyTrimmed
    }
  } else {
    throw new Error(
      `Invalid ledger url ${ledgerUrl}` +
        '. Expected url format "usb://ledger<pubkey>?key=<number>"'
    )
  }

  return { parsedPubkey, parsedDerivedPath }
}

export async function searchDerivedPathFromPubkey(
  pubkey: PublicKey,
  logger: LoggerPlaceholder | undefined = undefined,
  heuristicDepth: number | undefined = 10,
  heuristicWide: number | undefined = 3
): Promise<{ derivedPath: string; solanaApi: Solana } | null> {
  const ledgerDevices = getDevices()
  if (ledgerDevices.length === 0) {
    throw new Error('No ledger device found')
  }
  const openedTransports = await openTransports(...ledgerDevices)

  const heuristicsCombinations: number[][] = generateAllCombinations(
    heuristicDepth,
    heuristicWide
  )

  for (const openedTransport of openedTransports) {
    const solanaApi = new Solana(openedTransport)
    for (const combination of heuristicsCombinations) {
      const strCombination = combination.map(v => v.toString())
      strCombination.unshift(SOLANA_LEDGER_BIP44_BASE_PATH)
      const heuristicDerivedPath = strCombination.join('/')

      logDebug(logger, `search loop: ${heuristicDerivedPath}`)
      const ledgerPubkey = await getPublicKey(solanaApi, heuristicDerivedPath)
      if (ledgerPubkey.equals(pubkey)) {
        logDebug(
          logger,
          `Using derived path ${heuristicDerivedPath}, pubkey ${pubkey.toBase58()}`
        )
        return { derivedPath: heuristicDerivedPath, solanaApi }
      }
    }
  }
  return null
}

/**
 *
 * Parsing the derived path string to check heuristic depth and wide.
 *
 * When the derived path is e.g., 44'/501'/0/0/5 then
 * the wide will be 3, depth will be max of the provided numbers as it's 5.
 */
export function getHeuristicDepthAndWide(
  derivedPath: string,
  defaultDepth = 10,
  defaultWide = 3
): { depth: number; wide: number } {
  let depth = defaultDepth
  let wide = defaultWide

  let splitDerivedPath = derivedPath.split('/')
  // we expect derived path starts with solana derivation path 44'/501'
  // going to check parts after first 2
  if (splitDerivedPath.length > 2) {
    splitDerivedPath = splitDerivedPath.slice(2)
    wide = Math.max(defaultWide, splitDerivedPath.length)
    depth = Math.max(defaultDepth, ...splitDerivedPath.map(v => parseFloat(v)))
  }
  return { depth, wide }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function openTransports(...devices: any[]): Promise<TransportNodeHid[]> {
  const transports: TransportNodeHid[] = []
  for (const device of devices) {
    let transport = IN_LIB_TRANSPORT_CACHE.get(device.path)
    if (transport === undefined) {
      transport = await TransportNodeHid.open(device.path)
      scheduleTransportCloseOnExit(transport)
      IN_LIB_TRANSPORT_CACHE.set(device.path, transport)
    }
    transports.push(transport)
  }
  return transports
}

/**
 * Trying to close all provided transports in case of abrupt exit, or just exit
 * (ignoring errors when closing the transport).
 *
 * @param transports set of transport to be closed on exit
 */
function scheduleTransportCloseOnExit(...transports: TransportNodeHid[]): void {
  scheduleOnExit(() => {
    for (const openedTransport of transports) {
      try {
        openedTransport.close()
      } catch (e) {
        // ignore error and go to next transport
      }
    }
  })
}
