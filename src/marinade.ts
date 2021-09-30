#!/bin/node
import { program } from "commander";
import { show } from "./commands/show.js";

async function main(argv: string[], _env: Record<string, unknown>) {

  program
    .version("0.0.1")
    .allowExcessArguments(false);

  program
    .command("show")
    .description("show marinade state")
    .action(show);

  // program
  //   .command("stake <amount>")
  //   .description("stake SOL get mSOL")
  //   .action(stake);

  // program
  //   .command("unstake <amount>")
  //   .option("-f, --max-fee","max fee accepted")
  //   .option("-m, --min-sol","min SOL accepted")
  //   .option("--sol","amount measured in sol")
  //   .description("unstake mSOL, get SOL")
  //   .action(unstakeNow);

  program.parse(argv);

}

main(process.argv, process.env);

