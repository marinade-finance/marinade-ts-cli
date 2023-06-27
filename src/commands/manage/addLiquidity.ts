import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { getContext } from '../../context'
import { executeTx } from '../../utils/transactions'

export function installAddLiquidity(program: Command) {
  program
    .command('add-liquidity')
    .description('Provide liquidity to the liquidity pool')
    .argument('<amount-sol>', 'SOL amount to add to liquidity pool', parseFloat)
    .action(async (amountSol: number) => {
      await addLiquidity({
        amountSol,
      })
    })
}

export async function addLiquidity({
  amountSol,
}: {
  amountSol: number
}): Promise<void> {
  const { logger, connection, walletSigner, simulate, printOnly } = getContext()

  const amountLamports = MarinadeUtils.solToLamports(amountSol)
  logger.info(
    'Adding liquidity: %d SOL (lamports %s)',
    amountSol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedLPTokenAccountAddress, transaction } =
    await marinade.addLiquidity(amountLamports)

  logger.info(
    'Using associated LP account: %s',
    associatedLPTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage: `Failed to add ${amountSol} SOLs from ${walletSigner.publicKey.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Successfully added liquidity of %d SOLs from %s',
    amountSol,
    walletSigner.publicKey.toBase58()
  )
}
