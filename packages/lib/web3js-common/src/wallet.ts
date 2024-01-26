import {
  Transaction,
  VersionedTransaction,
  PublicKey,
  Signer,
  Keypair,
} from '@solana/web3.js'
import { isVersionedTransaction } from './tx'

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

export class NullWallet implements Wallet {
  readonly publicKey: PublicKey = PublicKey.default

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    return tx
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs
  }
}

export class PubkeyWallet implements Wallet {
  constructor(readonly publicKey: PublicKey) {}

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    return tx
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs
  }
}

export class KeypairWallet implements Wallet {
  constructor(readonly keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T> {
    if (isVersionedTransaction(tx)) {
      tx.sign([this.keypair])
    } else {
      tx.partialSign(this.keypair)
    }
    return tx
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]> {
    return txs.map(tx => {
      if (isVersionedTransaction(tx)) {
        tx.sign([this.keypair])
      } else {
        tx.partialSign(this.keypair)
      }
      return tx
    })
  }
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

export function isSigner(
  key: PublicKey | Signer | Keypair | Wallet | undefined
): key is Signer | Keypair | Wallet {
  return (
    key !== undefined &&
    'publicKey' in key &&
    ('secretKey' in key || 'signTransaction' in key)
  )
}

export function signer(
  key: PublicKey | Signer | Keypair | Wallet | undefined
): Signer | Keypair | Wallet {
  if (isSigner(key)) {
    return key
  } else {
    throw new Error(
      `signer: expected signer but it's not: ${
        key === undefined ? undefined : key.toBase58()
      }`
    )
  }
}

export function pubkey(
  key: PublicKey | Signer | Keypair | Wallet | undefined
): PublicKey {
  if (key === undefined) {
    throw new Error("pubkey: expected pubkey or signer but it's undefined")
  }
  return isSigner(key) ? key.publicKey : key
}

export function signerWithPubkey(
  key: PublicKey | Signer | Keypair | Wallet | undefined
): [Signer | Keypair | Wallet, PublicKey] {
  if (key === undefined) {
    throw new Error(
      "signerWithPubkey: expected pubkey or signer but it's undefined"
    )
  }
  if (!isSigner(key)) {
    throw new Error(
      `signerWithPubkey: expected signer but it's not: ${key.toBase58()}`
    )
  }
  return [key, key.publicKey]
}
