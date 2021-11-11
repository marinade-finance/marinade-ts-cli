#!/bin/node
import { program } from "commander"
import { show } from "./commands/show"
import { addLiquidityAction } from "./commands/add-liquidity"
import { removeLiquidityAction } from './commands/remove-liquidity'
import { stakeAction } from './commands/stake'

async function main(argv: string[], _env: Record<string, unknown>) {

  program
    .version("0.0.1")
    .allowExcessArguments(false)

  program
    .command("show")
    .option("-l, --list","list marinade validators & stake accounts")
    .description("show marinade state")
    .action(show)

  program
    .command("stake <amount-sol>")
    .description("stake SOL")
    .action(stakeAction)

  program
    .command("add-liquidity <amount-sol>")
    .description("provide liquidity to the liquidity pool")
    .action(addLiquidityAction)

  program
    .command("remove-liquidity <amount-sol>")
    .description("remove liquidity from the liquidity pool")
    .action(removeLiquidityAction)

  // program
  //   .command("stake <amount>")
  //   .description("stake SOL get mSOL")
  //   .action(stake);

  // program
  //   .command("unstake <mSOL_amount>")
  //   .option("-f, --max-fee","max fee accepted")
  //   .option("-m, --min-sol","min SOL accepted")
  //   .description("unstake mSOL, get SOL")
  //   .action(unstakeNow);

  program.parse(argv)

}

main(process.argv, process.env)

