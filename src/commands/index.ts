import { Command } from 'commander'
import { installShow } from './show'
import { installShowBalance } from './balance'
import { installShowReferralState } from './showReferralState'
import { installShowTickets } from './showTickets'
import { installManage } from './manage'

export function installCommands(program: Command) {
  installShowBalance(program)
  installShowReferralState(program)
  installShow(program)
  installManage(program)
  installShowTickets(program)
}
