import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN, web3 } from '@marinade.finance/marinade-ts-sdk'
import { ServerStreamFileResponseOptionsWithError } from 'http2'
import { getProvider } from '@project-serum/anchor'

type Options = Partial<{
  referral: string
}>

export async function stakeAction(amountSol: string | number, options: Options): Promise<void> {
  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Staking:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const provider = getProvider()

  const { referral } = options;
  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralAccount = referral ? new web3.PublicKey(referral) : null
  const marinadeConfig = new MarinadeConfig({ connection: provider.connection, publicKey: provider.wallet.publicKey, referralCode: referralAccount })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } = await marinade.deposit(amountLamports)
  console.log('Using associated mSOL account', associatedMSolTokenAccountAddress.toBase58())
  const signature = await provider.send(transaction)
  console.log('Transaction signature', signature)
}
