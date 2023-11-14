import { Command } from 'commander'
import { getMarinadeCliContext } from '../context'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { print_data, reformat } from '@marinade.finance/cli-common'

export function installShowEvent(program: Command) {
  program
    .command('show-event')
    .description('Showing data of anchor event')
    .argument('<event-data>', 'base64 data of anchor event')
    .action(async (eventData: string) => {
      await showEvent({
        eventData,
      })
    })
}

async function showEvent({ eventData }: { eventData: string }) {
  const { connection, wallet } = getMarinadeCliContext()

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const decodedData =
    marinade.marinadeFinanceProgram.program.coder.events.decode(eventData) ??
    marinade.marinadeReferralProgram.program.coder.events.decode(eventData)
  if (decodedData === null) {
    throw new Error(
      'Failed to decode event data as MarinadeFinance (liquid-staking-program) or MarinadeReferral (/liquid-staking-referral-program) event'
    )
  }

  const reformattedData = reformat(decodedData)
  print_data(reformattedData, 'yaml')
}
