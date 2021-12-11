import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN, web3 } from '@marinade.finance/marinade-ts-sdk'
import { getNodeJsProvider, PROVIDER_URL } from '../utils/anchor'

type Options = Partial<{
  referral: string
}>

export async function stakeAction(amountSol: string | number, { referral }: Options): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Staking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  console.log('Provider url:', PROVIDER_URL)
  const provider = getNodeJsProvider()
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralAccount = referral ? new web3.PublicKey(referral) : null
  const marinadeConfig = new MarinadeConfig({ connection: provider.connection, publicKey: provider.wallet.publicKey, referralCode: referralAccount })
  const marinade = new Marinade(marinadeConfig)
  const { associatedMSolTokenAccountAddress, transaction } = await marinade.deposit(amountLamports)
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  
  const signature = await provider.send(transaction)
  console.log('Transaction signature', signature)
}
