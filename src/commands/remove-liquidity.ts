import { Marinade, MarinadeConfig, MarinadeUtils, Wallet } from '@marinade.finance/marinade-ts-sdk'
import { connection, provider, PROVIDER_URL } from '../utils/anchor'

export async function removeLiquidityAction (amountSol: string | number): Promise<void> {
  const amountLamports = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Removing liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const publicKey = Wallet.local().payer.publicKey
  const marinadeConfig = new MarinadeConfig({ connection, publicKey })
  const marinade = new Marinade(marinadeConfig)

  const {
    associatedLPTokenAccountAddress,
    associatedMSolTokenAccountAddress,
    transaction,
  } = await marinade.removeLiquidity(amountLamports)
  const transactionSignature = await provider.send(transaction)

  console.log('Solana net:', PROVIDER_URL)
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())
  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())
  console.log('Using associated msol account', associatedMSolTokenAccountAddress.toBase58())
  console.log('Transaction', transactionSignature)
}
