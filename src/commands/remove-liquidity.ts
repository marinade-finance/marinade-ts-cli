import { BN, Wallet } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeConfig } from '../modules/marinade-config'

export const removeLiquidity = async (amount: number): Promise<void> => {
  console.log('Removing liquidity:', amount, 'LP tokens')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedLPTokenAccountAddress,
    associatedMSolTokenAccountAddress,
    transactionSignature,
  } = await marinade.removeLiquidity(amount)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated smart-lp account', associatedLPTokenAccountAddress.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
