import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { executeTx, parsePubkey } from '@marinade.finance/web3js-1x'

import { getMarinadeCliContext } from '../../context'

import type { PublicKey } from '@solana/web3.js'
import type { Command } from 'commander'

export function installClaim(program: Command) {
  program
    .command('claim')
    .description('Claim ordered unstake ticket')
    .argument('<ticket>', 'Ticket account to be claimed', parsePubkey)
    .action(async (ticket: Promise<PublicKey>) => {
      await claim({
        ticket: await ticket,
      })
    })
}

export async function claim({ ticket }: { ticket: PublicKey }): Promise<void> {
  const {
    connection,
    logger,
    wallet,
    simulate,
    printOnly,
    confirmationFinality,
  } = getMarinadeCliContext()

  logger.info('Claiming unstake ticket %s', ticket.toString())

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.claim(ticket)

  await executeTx({
    connection,
    errMessage: `Failed to claim ticket ${ticket.toBase58()}`,
    signers: [wallet],
    transaction,
    logger,
    simulate,
    printOnly,
    confirmOpts: confirmationFinality,
  })
  logger.info('Successfully claimed ticket %s', ticket.toBase58())
}
