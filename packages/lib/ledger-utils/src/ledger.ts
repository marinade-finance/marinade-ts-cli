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

export const CLI_LEDGER_URL_PREFIX = 'usb://ledger'
export const SOLANA_LEDGER_BIP44_BASE_PATH = "44'/501'/"
export const SOLANA_LEDGER_BIP44_BASE_REGEXP = /^44[']{0,1}\/501[']{0,1}\//
export const DEFAULT_DERIVATION_PATH = SOLANA_LEDGER_BIP44_BASE_PATH + "0'/0'"

/**
 * Wallet interface for objects that can be used to sign provider transactions.
 * The interface is compatible with @coral-xyz/anchor/dist/cjs/provider in version 0.28.0
 * See https://github.com/coral-xyz/anchor/blob/v0.28.0/ts/packages/anchor/src/provider.ts#L344
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
   * "Constructor" of SolanaLedger class.
   * From ledger url in format of usb://ledger[/<pubkey>[?key=<number>]
   * creates wrapper class around Solana ledger device from '@ledgerhq/hw-app-solana' package.
   */
  static async instance(ledgerUrl = '0'): Promise<LedgerWallet> {
    const { pubkey, derivedPath } = parseLedgerUrl(ledgerUrl)

    const solanaApi = await LedgerWallet.findByPubkey(pubkey, derivedPath)
    const publicKey = await LedgerWallet.getPublicKey(solanaApi, derivedPath)

    return new LedgerWallet(solanaApi, derivedPath, publicKey)
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

    let transport: TransportNodeHid | undefined = undefined
    if (pubkey === undefined) {
      // taking first device
      transport = await TransportNodeHid.open('')
    } else {
      // for cycle for ledgerDevices searching open transport
      // and then searching for pubkey
      for (const device of ledgerDevices) {
        const tempTransport = await TransportNodeHid.open(device.path)
        const solanaApi = new Solana(tempTransport)
        const ledgerPubkey = await LedgerWallet.getPublicKey(
          solanaApi,
          derivedPath
        )
        if (ledgerPubkey.equals(pubkey)) {
          transport = tempTransport
          break // the last found transport is the one we need
        }
      }

      if (transport === undefined) {
        // let's do some heuristic search, currently up to 25
        const upTo = 25
        const derivedPathLength = derivedPath.split('/').length - 2 // 44'/501'/<number>
        const allCombinations: number[][] =
          LedgerWallet.generateAllCombinations(upTo, derivedPathLength)
        for (const device of ledgerDevices) {
          const tempTransport = await TransportNodeHid.open(device.path)
          for (const combination of allCombinations) {
            const derivedPath =
              SOLANA_LEDGER_BIP44_BASE_PATH + combination.join('/')
            const solanaApi = new Solana(tempTransport)
            const ledgerPubkey = await LedgerWallet.getPublicKey(
              solanaApi,
              derivedPath
            )
            if (ledgerPubkey.equals(pubkey)) {
              console.log(
                `Using derived path ${derivedPath}, pubkey ${pubkey.toBase58()}`
              )
              transport = tempTransport
              break // the last found transport is the one we need
            }
          }
        }
      }

      if (transport === undefined) {
        throw new Error(
          'Available ledger devices does not provide pubkey ' +
            pubkey.toBase58() +
            ' for derivation path ' +
            derivedPath
        )
      }
    }

    return new Solana(transport)
  }

  private static generateAllCombinations(
    max: number,
    maxLength: number
  ): number[][] {
    const combinations: number[][] = []
    function generate(prefix: number[], remainingLength: number): void {
      if (remainingLength === 0) {
        combinations.push(prefix)
        return
      }
      for (let i = 0; i <= max; i++) {
        generate([...prefix, i], remainingLength - 1)
      }
    }
    for (let length = 1; length <= maxLength; length++) {
      generate([], length)
    }
    return combinations
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
