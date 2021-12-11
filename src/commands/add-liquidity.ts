import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN } from '@marinade.finance/marinade-ts-sdk'
import { connection, PROVIDER_URL, getNodeJsProvider } from '../utils/anchor'

export async function addLiquidityAction(amountSol: string | number): Promise<void> {

  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Adding liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  console.log('Provider url:', PROVIDER_URL)

  const provider = getNodeJsProvider()

  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  const marinadeConfig = new MarinadeConfig({ connection, publicKey: provider.wallet.publicKey })
  const marinade = new Marinade(marinadeConfig)

  const { associatedLPTokenAccountAddress, transaction } =
    await marinade.addLiquidity(amountLamports)

  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())

  // send the transaction
  const signature = await provider.send(transaction)

  console.log('Transaction signature', signature)
}
