import { Wallet, BN } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeConfig } from '../modules/marinade-config'
import { solToLamports } from '../util/conversion'

export async function addLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports:BN = solToLamports(Number(amountSol))
  console.log('Adding liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedLPTokenAccountAddress,
    transactionSignature,
  } = await marinade.addLiquidity(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
