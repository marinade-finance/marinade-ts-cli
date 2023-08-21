import { Command } from 'commander'
import { installAddLiquidity } from './addLiquidity'
import { installRemoveLiquidity } from './removeLiquidity'
import { installDeposit } from './deposit'
import { installLiquidUnstake } from './liquidUnstake'
import { installDepositStakeAccount } from './depositStakeAccount'
import { installClaim } from './claim'
import { installOrderUnstake } from './orderUnstake'
import { installWithdrawStakeAccount } from './withdrawStakeAccount'

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
