import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { useContext } from '../../context'
import { executeTx } from '../../utils/transactions'

export function installOrderUnstake(program: Command) {
  program
    .command('order-unstake')
    .description('Order unstake to get a ticket that can be claimed later')
    .argument('<amount-msol>', 'mSOL amount to order unstake', parseFloat)
    .action(async (amountMsol: number) => {
      await orderUnstake({
        amountMsol,
      })
    })
}

export async function orderUnstake({
  amountMsol,
}: {
  amountMsol: number
}): Promise<void> {
  const { connection, logger, walletSigner, simulate, printOnly } = useContext()

  const amountLamports = MarinadeUtils.solToLamports(amountMsol)
  logger.info(
    'Order unstake: %d mSOL (lamports %s)',
    amountMsol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const {
    associatedMSolTokenAccountAddress,
    transaction,
    ticketAccountKeypair,
  } = await marinade.orderUnstake(amountLamports)
  logger.info(
    'Using associated msol account: %s',
    associatedMSolTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage: `Failed to order unstake ${amountMsol} mSOLs for ${walletSigner.publicKey.toBase58()}`,
    signers: [walletSigner, ticketAccountKeypair],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Succcesfully ordered unstake %d mSOLs (signed by %s). Ticket: %s',
    amountMsol,
    walletSigner.publicKey.toBase58(),
    ticketAccountKeypair.publicKey.toBase58()
  )
}
