import { BN, Wallet } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeConfig } from '../modules/marinade-config'
import { solToLamportsBN } from '../util/conversion'

export const addLiquidity = async (amount: number, { sol }: { sol: boolean }): Promise<void> => {
  const amountLamports = sol ? solToLamportsBN(amount) : new BN(amount)
  console.log('Adding liquidity:', amountLamports, 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedTokenAccountAddress,
    transactionSignature,
  } = await marinade.addLiquidity(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated smart-lp account', associatedTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
