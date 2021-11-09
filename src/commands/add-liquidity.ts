import { Wallet } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeConfig } from '../modules/marinade-config'
import { solToLamportsBN } from '../util/conversion'

export async function addLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports = solToLamportsBN(Number(amountSol))
  console.log('Adding liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedLPTokenAccountAddress,
    transactionSignature,
  } = await marinade.addLiquidity(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated smart-lp account', associatedLPTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
