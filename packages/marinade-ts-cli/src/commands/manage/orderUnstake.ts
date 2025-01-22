import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { executeTx } from '@marinade.finance/web3js-common'
import { getMarinadeCliContext } from '../../context'

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
  const {
    connection,
    logger,
    wallet,
    simulate,
    printOnly,
    confirmationFinality,
  } = getMarinadeCliContext()

  const amountLamports = MarinadeUtils.solToLamports(amountMsol)
  logger.info(
    'Order unstake: %d mSOL (lamports %s)',
    amountMsol,
    amountLamports.toString(),
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const {
    associatedMSolTokenAccountAddress,
    transaction,
    ticketAccountKeypair,
  } = await marinade.orderUnstake(amountLamports)
  logger.info(
    'Using associated mSOL account: %s',
    associatedMSolTokenAccountAddress.toBase58(),
  )

  await executeTx({
    connection,
    errMessage: `Failed to order unstake ${amountMsol} mSOLs for ${wallet.publicKey.toBase58()}`,
    signers: [wallet, ticketAccountKeypair],
    transaction,
    logger,
    simulate,
    printOnly,
    confirmOpts: confirmationFinality,
  })
  logger.info(
    'Successfully ordered unstake %d mSOLs (signed by %s). Ticket: %s',
    amountMsol,
    wallet.publicKey.toBase58(),
    ticketAccountKeypair.publicKey.toBase58(),
  )
}
