import { installAddLiquidity } from './addLiquidity'
import { installClaim } from './claim'
import { installDeposit } from './deposit'
import { installDepositStakeAccount } from './depositStakeAccount'
import { installLiquidUnstake } from './liquidUnstake'
import { installOrderUnstake } from './orderUnstake'
import { installRemoveLiquidity } from './removeLiquidity'
import { installWithdrawStakeAccount } from './withdrawStakeAccount'

import type { Command } from 'commander'

export function installManage(program: Command) {
  installAddLiquidity(program)
  installRemoveLiquidity(program)
  installDeposit(program)
  installLiquidUnstake(program)
  installDepositStakeAccount(program)
  installClaim(program)
  installOrderUnstake(program)
  installWithdrawStakeAccount(program)
}
