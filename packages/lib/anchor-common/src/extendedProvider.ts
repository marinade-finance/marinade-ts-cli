import {
  ExtendedProvider,
  Wallet,
  executeTxSimple,
  transaction,
} from '@marinade.finance/web3js-common'
import {
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionInstructionCtorFields,
} from '@solana/web3.js'
import { AnchorProvider } from '@coral-xyz/anchor'

export class AnchorExtendedProvider
  extends AnchorProvider
  implements ExtendedProvider
{
  async sendIx(
    signers: (Wallet | Signer)[],
    ...ixes: (
      | Transaction
      | TransactionInstruction
      | TransactionInstructionCtorFields
    )[]
  ): Promise<void> {
    const tx = await transaction(this)
    tx.add(...ixes)
    await executeTxSimple(this.connection, tx, [this.wallet, ...signers])
  }

  get walletPubkey(): PublicKey {
    return this.wallet.publicKey
  }
}
