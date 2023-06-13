import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { useContext } from '../../context'
import { executeTx } from '../../utils/transactions'

export function installRemoveLiquidity(program: Command) {
  program
    .command('remove-liquidity')
    .description('Remove liquidity from the liquidity pool')
    .argument('<amount-sol>', 'amount to remove from pool', parseFloat)
    .action(async (amountSol: number) => {
      await removeLiquidity({
        amountSol,
      })
    })
}

export async function removeLiquidity({
  amountSol,
}: {
  amountSol: number
}): Promise<void> {
  const { connection, logger, walletSigner, simulate, printOnly } = useContext()

  const amountLamports = MarinadeUtils.solToLamports(amountSol)
  logger.info(
    'Removing liquidity: %s LP (lamports %s)',
    amountSol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const {
    associatedLPTokenAccountAddress,
    associatedMSolTokenAccountAddress,
    transaction,
  } = await marinade.removeLiquidity(amountLamports)

  logger.info(
    'Using associated LP account: %s, associated mSOL account: %s',
    associatedLPTokenAccountAddress.toBase58(),
    associatedMSolTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage:
      `Failed to remove ${amountSol} LPs, ` +
      `signed by ${walletSigner.publicKey.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Succcesfully removed liquidity of %d LPs, signed by %s',
    amountSol,
    walletSigner.publicKey.toBase58()
  )
}
