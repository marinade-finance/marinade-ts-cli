import Solana from '@ledgerhq/hw-app-solana'
import TransportNodeHid, {
  getDevices,
} from '@ledgerhq/hw-transport-node-hid-noevents'
import { MessageV0, PublicKey, Message } from '@solana/web3.js'

export const CLI_LEDGER_URL_PREFIX = 'usb://ledger'
export const SOLANA_LEDGER_BIP44_BASE_PATH = "44'/501'/"
export const SOLANA_LEDGER_BIP44_BASE_REGEXP = /^44[']{0,1}\/501[']{0,1}\//
export const DEFAULT_DERIVATION_PATH = SOLANA_LEDGER_BIP44_BASE_PATH + "0'/0'"

export class SolanaLedger {
  /**
   * "Constructor" of SolanaLedger class.
   * From ledger url in format of usb://ledger[/<pubkey>[?key=<number>]
   * creates wrapper class around Solana ledger device from '@ledgerhq/hw-app-solana' package.
   */
  static async instance(ledgerUrl = '0'): Promise<SolanaLedger> {
    const { pubkey, derivedPath } = parseLedgerUrl(ledgerUrl)

    const solanaApi = await SolanaLedger.findByPubkey(pubkey, derivedPath)
    const publicKey = await SolanaLedger.getPublicKey(solanaApi, derivedPath)

    return new SolanaLedger(solanaApi, derivedPath, publicKey)
  }

  private constructor(
    public readonly solanaApi: Solana,
    public readonly derivedPath: string,
    public readonly publicKey: PublicKey
  ) {}

  private static async getPublicKey(
    solanaApi: Solana,
    derivedPath: string
  ): Promise<PublicKey> {
    const { address: bufAddress } = await solanaApi.getAddress(derivedPath)
    return new PublicKey(bufAddress)
  }

  private static async findByPubkey(
    pubkey: PublicKey | undefined,
    derivedPath: string
  ): Promise<Solana> {
    const ledgerDevices = getDevices()
    if (ledgerDevices.length === 0) {
      throw new Error('No ledger device found')
    }

    let transport: TransportNodeHid
    if (pubkey === undefined) {
      // taking first device
      transport = await TransportNodeHid.open('')
    } else {
      // for cycle for ledgerDevices searching open transport
      // and then searching for pubkey
      for (const device of ledgerDevices) {
        transport = await TransportNodeHid.open(device.path)
        const solanaApi = new Solana(transport)
        const ledgerPubkey = await SolanaLedger.getPublicKey(
          solanaApi,
          derivedPath
        )
        if (ledgerPubkey.equals(pubkey)) {
          break // the last found transport is the one we need
        }
      }
      throw new Error(
        'Available ledger devices does not provide pubkey ' +
          pubkey.toBase58() +
          ' for derivation path ' +
          derivedPath
      )
    }
    return new Solana(transport)
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
  public async signMessage(message: MessageV0 | Message): Promise<Buffer> {
    const { signature } = await this.solanaApi.signTransaction(
      this.derivedPath,
      Buffer.from(message.serialize())
    )
    return signature
  }
}

/**
 * Parsing string as ledger url that could be in format of url or derivation path.
 * Some of the examples (trying to be compatible with solana cli https://github.com/solana-labs/solana/blob/v1.14.19/clap-utils/src/keypair.rs#L613)
 * Derivation path consists of the "44'" part that signifies the BIP44 standard, and the "501'" part that signifies the Solana's BIP44 coin type.
 *
 * - `usb://ledger` - taking first device and using solana default derivation path 44/501/0/0
 * - `usb://ledger?key=0/1` - taking first device and using solana derivation path 44/501/0/1
 * - `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd` - searching of all ledger devices where solana default derivation path 44/501/0/0 will result in pubkey 9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd
 * - `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd?key=0/1` - searching of all ledger devices where solana derivation path 44/501/0/1 will result in pubkey 9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd
 */
export function parseLedgerUrl(ledgerUrl: string): {
  pubkey: PublicKey | undefined
  derivedPath: string
} {
  ledgerUrl = ledgerUrl.trim()
  if (!ledgerUrl.startsWith(CLI_LEDGER_URL_PREFIX)) {
    throw new Error(
      `Invalid ledger url ${ledgerUrl}. Expected url started with "usb://ledger".`
    )
  }
  let pubkey: PublicKey | undefined
  let derivedPath: string

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
    pubkey = parsePubkey(parts[0])
    derivedPath = DEFAULT_DERIVATION_PATH
  } else if (parts.length === 2) {
    //case: usb://ledger/<pubkey>?key=<number>
    pubkey = parsePubkey(parts[0])
    const key = parts[1]
    if (key === '') {
      // case: usb://ledger/<pubkey>?key=
      derivedPath = DEFAULT_DERIVATION_PATH
    } else if (SOLANA_LEDGER_BIP44_BASE_REGEXP.test(key)) {
      // case: usb://ledger/<pubkey>?key=44'/501'/<number>
      derivedPath = key
    } else {
      // case: usb://ledger/<pubkey>?key=<number>
      derivedPath = SOLANA_LEDGER_BIP44_BASE_PATH + key
    }
  } else {
    throw new Error(
      `Invalid ledger url ${ledgerUrl}` +
        '. Expected url format "usb://ledger<pubkey>?key=<number>"'
    )
  }

  return { pubkey, derivedPath }
}
