import { Wallet, isVersionedTransaction } from '@marinade.finance/web3js-common'
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'

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
