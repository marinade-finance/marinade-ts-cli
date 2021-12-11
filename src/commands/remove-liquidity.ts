import { Marinade, MarinadeConfig, MarinadeUtils, Wallet } from '@marinade.finance/marinade-ts-sdk'
import { connection, getNodeJsProvider, PROVIDER_URL } from '../utils/anchor'

export async function removeLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Removing liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  console.log('Provider url:', PROVIDER_URL)
  const provider = getNodeJsProvider()
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  const marinadeConfig = new MarinadeConfig({ connection, publicKey: provider.wallet.publicKey })
  const marinade = new Marinade(marinadeConfig)

  const {
    associatedLPTokenAccountAddress,
    associatedMSolTokenAccountAddress,
    transaction,
  } = await marinade.removeLiquidity(amountLamports)

  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())

  const transactionSignature = await provider.send(transaction)
  console.log('Transaction signature', transactionSignature)
}
