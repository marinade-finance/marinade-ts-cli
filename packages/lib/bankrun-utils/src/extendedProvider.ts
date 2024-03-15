import {
  ExtendedProvider,
  Wallet,
  instanceOfWallet,
} from '@marinade.finance/web3js-common'
import {
  Keypair,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionInstructionCtorFields,
} from '@solana/web3.js'
import { BankrunProvider } from 'anchor-bankrun'
import { BanksTransactionMeta } from 'solana-bankrun'

export class BankrunExtendedProvider
  extends BankrunProvider
  implements ExtendedProvider
{
  async sendIx(
    signers: (Wallet | Signer | Keypair)[],
    ...ixes: (
      | Transaction
      | TransactionInstruction
      | TransactionInstructionCtorFields
    )[]
  ): Promise<void> {
    const tx = await bankrunTransaction(this)
    tx.add(...ixes)
    await bankrunExecute(this, [this.wallet, ...signers], tx)
  }

  get walletPubkey(): PublicKey {
    return this.wallet.publicKey
  }
}

export async function bankrunTransaction(
  provider: BankrunProvider
): Promise<Transaction> {
  const bh = await provider.context.banksClient.getLatestBlockhash()
  const lastValidBlockHeight = (
    bh === null ? Number.MAX_VALUE : bh[1]
  ) as number
  return new Transaction({
    feePayer: provider.wallet.publicKey,
    blockhash: provider.context.lastBlockhash,
    lastValidBlockHeight,
  })
}

export async function bankrunExecuteIx(
  provider: BankrunProvider,
  signers: (Wallet | Signer | Keypair)[],
  ...ixes: (
    | Transaction
    | TransactionInstruction
    | TransactionInstructionCtorFields
  )[]
): Promise<BanksTransactionMeta> {
  const tx = await bankrunTransaction(provider)
  tx.add(...ixes)
  return await bankrunExecute(provider, signers, tx)
}

export async function bankrunExecute(
  provider: BankrunProvider,
  signers: (Wallet | Signer | Keypair)[],
  tx: Transaction
): Promise<BanksTransactionMeta> {
  for (const signer of signers) {
    if (instanceOfWallet(signer)) {
      await signer.signTransaction(tx)
    } else if (signer instanceof Keypair || 'secretKey' in signer) {
      tx.partialSign(signer)
    } else {
      throw new Error(
        'bankrunExecute: provided signer parameter is not a signer: ' + signer
      )
    }
  }
  return await provider.context.banksClient.processTransaction(tx)
}
