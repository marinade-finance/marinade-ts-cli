import { Marinade, MarinadeConfig, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import { getProvider } from '@project-serum/anchor'

type Options = Partial<{
  referral: string
}>

export async function depositStakeAccountAction (stakeAccount: string, options: Options): Promise<void> {
  const stakeAccountAddress = new web3.PublicKey(stakeAccount)
  console.log('Depositing stake account:', stakeAccountAddress.toBase58())

  const provider = getProvider()

  const { referral } = options;
  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralCode = referral ? new web3.PublicKey(referral) : null

  const marinadeConfig = new MarinadeConfig({ 
    connection: provider.connection, 
    publicKey:provider.wallet.publicKey, 
    referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.depositStakeAccount(stakeAccountAddress)
  const signature = await provider.send(transaction)

  console.log('Transaction signature', signature)
}
