import { Marinade, MarinadeConfig, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import { connection, getNodeJsProvider, PROVIDER_URL } from '../utils/anchor'

type Options = Partial<{
  referral: string
}>

export async function depositStakeAccountAction (stakeAccount: string, { referral }: Options): Promise<void> {
  const stakeAccountAddress = new web3.PublicKey(stakeAccount)
  console.log('Depositing stake account:', stakeAccountAddress.toBase58())

  console.log('Provider url:', PROVIDER_URL)
  const provider = getNodeJsProvider()
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  if (referral) {
    console.log('Referral account:', referral)
  }
  const referralCode = referral ? new web3.PublicKey(referral) : null

  const marinadeConfig = new MarinadeConfig({ connection, publicKey:provider.wallet.publicKey, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.depositStakeAccount(stakeAccountAddress)
  const signature = await provider.send(transaction)

  console.log('Transaction signature', signature)
}
