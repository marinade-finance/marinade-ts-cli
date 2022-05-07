import { Wallet, BN } from '@project-serum/anchor'
import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk'
import { getProvider } from '@project-serum/anchor'

type Options = Partial<{
  referral: string
}>

export async function liquidUnstakeAction (amountMsol: string | number, options: Options): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountMsol))
  console.log('Liquid-unstaking:', amountMsol, 'mSOL')

  const provider = getProvider()

  const { referral } = options;
  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralCode = referral ? new web3.PublicKey(referral) : null
 
  const marinadeConfig = new MarinadeConfig({ connection:provider.connection, publicKey:provider.wallet.publicKey, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } = await marinade.liquidUnstake(amountLamports)
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())

  const transactionSignature = await provider.send(transaction)
  console.log('Transaction signature', transactionSignature)
}
