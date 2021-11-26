import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN } from '@marinade.finance/marinade-ts-sdk'

export async function stakeAction (amountSol: string | number): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Staking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedMSolTokenAccountAddress,
    transactionSignature,
  } = await marinade.deposit(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
