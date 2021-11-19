import { Wallet, BN } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeConfig } from '../modules/marinade-config'
import { solToLamports } from '../util/conversion'

export async function liquidUnstakeAction (amountSol: string | number): Promise<void> {
  const amountLamports: BN = solToLamports(Number(amountSol))
  console.log('Liquid-unstaking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    associatedMSolTokenAccountAddress,
    transactionSignature,
  } = await marinade.liquidUnstake(amountLamports)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
