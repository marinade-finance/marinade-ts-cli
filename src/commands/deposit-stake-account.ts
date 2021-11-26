import { Marinade, MarinadeConfig, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'

export async function depositStakeAccountAction (stakeAccount: string): Promise<void> {
  const stakeAccountAddress = new web3.PublicKey(stakeAccount)
  console.log('Depositing stake account:', stakeAccountAddress.toBase58())

  const marinadeConfig = new MarinadeConfig({ wallet: Wallet.local().payer })
  const marinade = new Marinade(marinadeConfig)
  const {
    transactionSignature,
  } = await marinade.depositStakeAccount(stakeAccountAddress)

  console.log('Solana net:', marinade.config.anchorProviderUrl)
  console.log('Using fee payer', marinade.config.wallet.publicKey.toBase58())
  console.log('Transaction', transactionSignature)
}
