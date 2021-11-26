import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN } from '@marinade.finance/marinade-ts-sdk'

export async function addLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
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
