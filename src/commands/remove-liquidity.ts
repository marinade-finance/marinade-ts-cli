import { Marinade, MarinadeConfig, MarinadeUtils, Wallet } from '@marinade.finance/marinade-ts-sdk'

export async function removeLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Removing liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedLPTokenAccountAddress,
    associatedMSolTokenAccountAddress,
    transactionSignature,
  } = await marinade.removeLiquidity(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
