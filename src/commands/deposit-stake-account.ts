import { Marinade, MarinadeConfig, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import { connection, provider, PROVIDER_URL } from '../utils/anchor'

type Options = Partial<{
  referral: string
}>

export async function depositStakeAccountAction (stakeAccount: string, { referral }: Options): Promise<void> {
  const stakeAccountAddress = new web3.PublicKey(stakeAccount)
  console.log('Depositing stake account:', stakeAccountAddress.toBase58())

  const publicKey = Wallet.local().payer.publicKey
  const referralCode = referral ? new web3.PublicKey(referral) : null
  const marinadeConfig = new MarinadeConfig({ connection, publicKey, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const {    transaction  } = await marinade.depositStakeAccount(stakeAccountAddress)
  const transactionSignature = await provider.send(transaction)

  console.log('Solana net:', PROVIDER_URL)
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())
  console.log('Transaction', transactionSignature)
}
