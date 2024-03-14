import {
  Commitment,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
  Signer,
  SimulatedTransactionResponse,
  Transaction,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import { Wallet } from './wallet'

/**
 * Interface compatible with AnchorProvider. It's a copy&paste to not enforcing anchor dependency.
 */
export interface Provider {
  readonly connection: Connection
  readonly publicKey?: PublicKey
  send?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: SendOptions
  ): Promise<TransactionSignature>
  sendAndConfirm?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOptions
  ): Promise<TransactionSignature>
  sendAll?<T extends Transaction | VersionedTransaction>(
    txWithSigners: {
      tx: T
      signers?: Signer[]
    }[],
    opts?: ConfirmOptions
  ): Promise<Array<TransactionSignature>>
  simulate?(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    commitment?: Commitment,
    includeAccounts?: boolean | PublicKey[]
  ): Promise<SuccessfulTxSimulationResponse>
}

export type SuccessfulTxSimulationResponse = Omit<
  SimulatedTransactionResponse,
  'err'
>

export type WalletProvider = Provider & { wallet: Wallet | Signer | Keypair }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instanceOfProvider(object: any): object is Provider {
  return object && typeof object === 'object' && 'connection' in object
}

export function instanceOfProviderWithWallet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: any
): object is Provider & { wallet: Wallet | Signer | Keypair } {
  return (
    object &&
    typeof object === 'object' &&
    'connection' in object &&
    'wallet' in object &&
    (object.wallet instanceof Keypair || // Keypair
      'secretKey' in object.wallet || // Signer
      ('signTransaction' in object.wallet &&
        'signAllTransactions' in object.wallet)) // Wallet
  )
}

export function providerPubkey(provider: Provider): PublicKey {
  if (provider.publicKey === undefined) {
    throw new Error(
      `Provider instance ${JSON.stringify(provider)} ` +
        'does not specify public key'
    )
  }
  return provider.publicKey
}

export function providerOrConnection(
  provider: Provider | Connection,
  feePayer?: PublicKey
): [Connection, PublicKey] {
  if (feePayer === undefined && instanceOfProvider(provider)) {
    feePayer = providerPubkey(provider)
  }
  if (feePayer === undefined) {
    throw new Error(
      'providerOrConnection: feePayer or instance of Provider has to be passed in to ' +
        'find the transaction fee payer'
    )
  }
  const connection = instanceOfProvider(provider)
    ? provider.connection
    : provider
  return [connection, feePayer]
}

export function walletProviderOrConnection(
  provider: Provider | Connection,
  feePayer?: Wallet | Signer | Keypair
): [Connection, Wallet | Signer | Keypair] {
  if (feePayer === undefined && instanceOfProviderWithWallet(provider)) {
    feePayer = provider.wallet
  }
  if (feePayer === undefined) {
    throw new Error(
      'walletProviderOrConnection: feePayer or instance of Wallet Provider has to be passed in to ' +
        'find the signer of transaction fee payer'
    )
  }
  const connection = instanceOfProvider(provider)
    ? provider.connection
    : provider
  return [connection, feePayer]
}

export class NullProvider implements Provider {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  publicKey?: PublicKey | undefined

  constructor(public readonly connection: Connection) {
    this.connection = connection
  }

  send(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    opts?: SendOptions | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    opts?: ConfirmOptions | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
  sendAll<T extends Transaction | VersionedTransaction>(
    txWithSigners: { tx: T; signers?: Signer[] | undefined }[],
    opts?: ConfirmOptions | undefined
  ): Promise<string[]> {
    throw new Error('Method not implemented.')
  }
  simulate(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[] | undefined,
    commitment?: Commitment | undefined,
    includeAccounts?: boolean | PublicKey[] | undefined
  ): Promise<SuccessfulTxSimulationResponse> {
    throw new Error('Method not implemented.')
  }
}
