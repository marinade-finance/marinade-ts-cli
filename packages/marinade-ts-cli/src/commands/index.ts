import { installShowBalance } from './balance'
import { installManage } from './manage'
import { installShow } from './show'
import { installShowEvent } from './showEvent'
import { installShowReferralState } from './showReferralState'
import { installShowTickets } from './showTickets'

import type { Command } from 'commander'

export function installCommands(program: Command) {
  installShowBalance(program)
  installShowReferralState(program)
  installShow(program)
  installManage(program)
  installShowTickets(program)
  installShowEvent(program)
}
