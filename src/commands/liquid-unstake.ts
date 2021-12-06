import { Wallet, BN } from '@project-serum/anchor'
import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk'
import { connection, provider, PROVIDER_URL } from '../utils/anchor'

type Options = Partial<{
  referral: string
}>

export async function liquidUnstakeAction (amountSol: string | number, { referral }: Options): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Liquid-unstaking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const publicKey = Wallet.local().payer.publicKey
  const referralCode = referral ? new web3.PublicKey(referral) : null
  const marinadeConfig = new MarinadeConfig({ connection, publicKey, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } = await marinade.liquidUnstake(amountLamports)
  const transactionSignature = await provider.send(transaction)

  console.log('Solana net:', PROVIDER_URL)
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
