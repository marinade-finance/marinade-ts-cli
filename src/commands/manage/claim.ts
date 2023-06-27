import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { parsePubkey } from '../../utils/cliParser'
import { Command } from 'commander'
import { PublicKey } from '@solana/web3.js'
import { useContext } from '../../context'
import { executeTx } from '../../utils/transactions'

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
  const { connection, logger, walletSigner, simulate, printOnly } = useContext()

  logger.info('Claiming unstake ticket %s', ticket.toString())

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.claim(ticket)

  await executeTx({
    connection,
    errMessage: `Failed to claim ticket ${ticket.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info('Successfully claimed ticket %s', ticket.toBase58())
}
