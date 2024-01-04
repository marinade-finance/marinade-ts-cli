import { Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instanceOfWallet(object: any): object is Wallet {
  return (
    object &&
    'signTransaction' in object &&
    'signAllTransactions' in object &&
    'publicKey' in object
  )
}
