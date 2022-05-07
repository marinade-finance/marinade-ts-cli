import { Marinade, MarinadeConfig, MarinadeUtils, Wallet, BN } from '@marinade.finance/marinade-ts-sdk'
import { getProvider } from '@project-serum/anchor'

export async function addLiquidityAction(amountSol: string | number, options: Record<string,any>): Promise<void> {

  const amountLamports: BN = MarinadeUtils.solToLamports(Number(amountSol))
  console.log('Adding liquidity:', amountSol, 'SOL', amountLamports.toString(), 'lamports')

  const provider = getProvider()
  console.log('Using fee payer', provider.wallet.publicKey.toBase58())

  const marinadeConfig = new MarinadeConfig({ connection:provider.connection, publicKey: provider.wallet.publicKey })
  const marinade = new Marinade(marinadeConfig)

  const { associatedLPTokenAccountAddress, transaction } =
    await marinade.addLiquidity(amountLamports)

  console.log('Using associated LP account', associatedLPTokenAccountAddress.toBase58())

  // send the transaction
  const signature = await provider.send(transaction)

  console.log('Transaction signature', signature)
}
