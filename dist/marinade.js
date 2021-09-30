#!/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const show_js_1 = require("./commands/show.js");
async function main(argv, _env) {
    commander_1.program
        .version("0.0.1")
        .allowExcessArguments(false);
    commander_1.program
        .command("show")
        .description("show marinade state")
        .action(show_js_1.show);
    // program
    //   .command("stake <amount>")
    //   .description("stake SOL get mSOL")
    //   .action(stake);
    // program
    //   .command("unstake <amount>")
    //   .option("-f, --max-fee","max fee accepted")
    //   .option("-m, --min-sol","min SOL accepted")
    //   .option("--sol","amount measured in sol")
    //   .description("setup MNDE token")
    //   .action(unstakeNow);
    commander_1.program.parse(argv);
}
main(process.argv, process.env);
//# sourceMappingURL=marinade.js.map