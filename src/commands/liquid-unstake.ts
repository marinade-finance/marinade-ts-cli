import { Wallet, BN } from '@project-serum/anchor'
import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk'
import { connection, getNodeJsProvider, PROVIDER_URL } from '../utils/anchor'

type Options = Partial<{
  referral: string
}>

export async function liquidUnstakeAction (amountSol: string | number, { referral }: Options): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Liquid-unstaking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  console.log('Provider url:', PROVIDER_URL)
  const provider = getNodeJsProvider()
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralCode = referral ? new web3.PublicKey(referral) : null
  
  const marinadeConfig = new MarinadeConfig({ connection, publicKey:provider.wallet.publicKey, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } = await marinade.liquidUnstake(amountLamports)
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())

  const transactionSignature = await provider.send(transaction)
  console.log('Transaction signature', transactionSignature)
}
