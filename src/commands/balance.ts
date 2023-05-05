import { Marinade, MarinadeUtils, BN, MarinadeConfig, MarinadeBorsh, MarinadeState, Provider } from '@marinade.finance/marinade-ts-sdk'
import { lamportsToSol, getAssociatedTokenAccountAddress } from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import { getProvider } from '@project-serum/anchor'

export async function balance(options: Object): Promise<void> {

  const provider = getProvider()

  console.log(`Main account: ${provider.wallet.publicKey.toBase58()}`)
  console.log(`Note: transactions can take up to a minute to be reflected here`)

  const config = new MarinadeConfig({ connection:provider.connection })
  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState()

  const {
    lpMint,
    mSolMintAddress,
  } = marinadeState


  const balanceLamports = new BN(await provider.connection.getBalance(provider.wallet.publicKey))
  console.log(`SOL Balance: ${lamportsToSol(balanceLamports)}`)

  const userMSolATA = await getAssociatedTokenAccountAddress(mSolMintAddress, provider.wallet.publicKey)
  const { value: { amount :amountMSOL } } = await provider.connection.getTokenAccountBalance(userMSolATA)
  const mSolATABalance = new BN(amountMSOL)
  console.log(`mSOL Balance: ${lamportsToSol(mSolATABalance)}`)

  const userLpATA = await getAssociatedTokenAccountAddress(lpMint.address, provider.wallet.publicKey)
  const { value: { amount: amountLP } } = await provider.connection.getTokenAccountBalance(userLpATA)
  const userLpATABalance = new BN(amountLP)
  console.log(`mSOL-SOL-LP Balance: ${lamportsToSol(userLpATABalance)}`)

}
