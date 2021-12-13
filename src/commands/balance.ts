import { Marinade, MarinadeUtils, BN, MarinadeConfig, MarinadeBorsh, MarinadeState, Provider } from '@marinade.finance/marinade-ts-sdk'
import { lamportsToSol, getAssociatedTokenAccountAddress } from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import { getNodeJsProvider } from '../utils/anchor'


export async function balance(options: Object): Promise<void> {

  const provider = getNodeJsProvider()

  console.log(`Main account: ${provider.wallet.publicKey.toBase58()}`)
  console.log(`Note: transactions can take up to a minute to be reflected here`)

  const config = new MarinadeConfig({ connection:provider.connection })
  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState()

  const {
    state,
    lpMint,
    mSolMint,
    mSolMintAddress,
    mSolPrice,
    mSolLeg, // @todo fetch from Marinade instead for MarinadeState? This should be configurable https://docs.marinade.finance/developers/contract-addresses
    treasuryMsolAccount,
    rewardsCommissionPercent,
  } = marinadeState


  const balanceLamports = new BN(await provider.connection.getBalance(provider.wallet.publicKey))
  console.log(`SOL Balance: ${lamportsToSol(balanceLamports)}`)

  const userMSolATA = await getAssociatedTokenAccountAddress(mSolMintAddress, provider.wallet.publicKey)
  const mSolMintClient = mSolMint.mintClient()
  const mSolATAInfo = await mSolMintClient.getAccountInfo(userMSolATA)
  console.log(`mSOL Balance: ${lamportsToSol(mSolATAInfo.amount)}`)

  const userLpATA = await getAssociatedTokenAccountAddress(lpMint.address, provider.wallet.publicKey)
  const lpMintClient = lpMint.mintClient()
  const lpATAInfo = await lpMintClient.getAccountInfo(userLpATA)
  console.log(`mSOL-SOL-LP Balance: ${lamportsToSol(lpATAInfo.amount)}`)

}
