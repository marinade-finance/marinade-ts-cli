import { Marinade, MarinadeConfig, MarinadeUtils, Wallet } from '@marinade.finance/marinade-ts-sdk'
import { getProvider } from '@project-serum/anchor'

export async function removeLiquidityAction (amountSol: string | number, options:Record<string,any>): Promise<void> {
  const amountLamports = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Removing liquidity:', amountSol, 'LP')

  const provider = getProvider()

  const marinadeConfig = new MarinadeConfig({ connection: provider.connection, publicKey: provider.wallet.publicKey })
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
