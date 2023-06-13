import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { useContext } from '../context'
import { parsePubkey } from '../utils/cliParser'
import { PublicKey } from '@solana/web3.js'

export function installShowTickets(program: Command) {
  program
    .command('show-tickets')
    .description(
      'Show delayed unstake tickets for a beneficiary (initialized by order-unstake)'
    )
    .option(
      '-b, --beneficiary <pubkey>',
      'Tickets beneficiary that can claim them later (default: wallet keypair pubkey)',
      parsePubkey
    )
    .action(async ({ beneficiary }: { beneficiary?: Promise<PublicKey> }) => {
      await showTickets({
        beneficiary: await beneficiary,
      })
    })
}

async function showTickets({
  beneficiary = useContext().walletSigner.publicKey,
}: {
  beneficiary?: PublicKey
}) {
  const { connection } = useContext()

  const marinadeConfig = new MarinadeConfig({
    connection,
  })
  const marinade = new Marinade(marinadeConfig)
  const tickets = await marinade.getDelayedUnstakeTickets(beneficiary)

  console.log('Tickets for %s', beneficiary.toBase58())
  if (tickets.size === 0) {
    console.log('No tickets found')
  } else {
    for (const ticket of tickets.entries()) {
      const amount = ticket[1].lamportsAmount
      console.log('-', ticket[0].toBase58())
      console.log(
        '-- amount: %d SOL (lamports: %s)',
        MarinadeUtils.lamportsToSol(amount),
        amount.toString()
      )
      console.log('-- created epoch:', ticket[1].createdEpoch.toString())
      console.log('-- state address:', ticket[1].stateAddress.toBase58())
      console.log('-- ticket due:', ticket[1].ticketDue)
      console.log('-- ticket due date:', ticket[1].ticketDueDate)
    }
  }
}
