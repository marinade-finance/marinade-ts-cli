import { printData } from '@marinade.finance/cli-common'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { reformat } from '@marinade.finance/web3js-1x'

import { getMarinadeCliContext } from '../context'

import type { Command } from 'commander'

export function installShowEvent(program: Command) {
  program
    .command('show-event')
    .description('Showing data of anchor event')
    .argument('<event-data>', 'base64 data of anchor event')
    .action((eventData: string) => {
      showEvent({
        eventData,
      })
    })
}

function showEvent({ eventData }: { eventData: string }) {
  const { connection, wallet } = getMarinadeCliContext()

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const eventDataTrimmed = eventData
    .trim()
    .replace(/Program data:/g, '')
    .trim()
  const decodedData =
    marinade.marinadeFinanceProgram.program.coder.events.decode(
      eventDataTrimmed,
    ) ??
    marinade.marinadeReferralProgram.program.coder.events.decode(
      eventDataTrimmed,
    )
  if (decodedData === null) {
    throw new Error(
      'Failed to decode event data as MarinadeFinance (liquid-staking-program) or MarinadeReferral (/liquid-staking-referral-program) event',
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const reformattedData = reformat(decodedData)
  printData(reformattedData, 'yaml')
}
