#!/usr/bin/env node
import { program } from "commander"
import { show } from "./commands/show"
import { balance } from "./commands/balance"
import { addLiquidityAction } from "./commands/add-liquidity"
import { removeLiquidityAction } from './commands/remove-liquidity'
import { stakeAction } from './commands/deposit'
import { liquidUnstakeAction } from './commands/liquid-unstake'
import { depositStakeAccountAction } from './commands/deposit-stake-account'
import { showReferralStateAction } from './commands/show-referral-state'
import { setProvider as anchorSetDefaultProvider} from '@project-serum/anchor'
import { getNodeJsProvider, getProviderUrl } from "./utils/anchor"

async function main(argv: string[], _env: Record<string, unknown>) {

  program
    .version("0.0.1")
    .allowExcessArguments(false)
    .option('-u <moniker>', 'override ANCHOR_PROVIDER_URL or m=mainnet, d=devnet, t=testnet', 'm')
    .hook('preAction', () => {
      // before any command, set anchor default provider
      console.log("Provider URL:",getProviderUrl(program.opts()))
      const provider = getNodeJsProvider(program.opts())
      // set anchor default provider based on program options (-u)
      anchorSetDefaultProvider(provider)
      // show also fee payer/default account
      console.log('Using fee payer', provider.wallet.publicKey.toBase58())
    })

  program
    .command("show")
    .option("-l, --list", "list marinade validators & stake accounts")
    .description("show marinade state")
    .action(show)

  program
    .command("show-referral-state <referral>")
    .description("show referral partner's state")
    .action(showReferralStateAction)

  program
    .command("balance")
    .description("show your account balances")
    .action(balance)

  program
    .command("deposit-stake-account <stake-account>")
    .option("-r, --referral <referral-code>", "Use the referral code")
    .description("deposit stake account")
    .action(depositStakeAccountAction)

  program
    .command("stake <amount-sol>")
    .option("-r, --referral <referral-code>", "Use the referral code")
    .description("stake SOL")
    .action(stakeAction)

  program
    .command("liquid-unstake <amount-sol>")
    .option("-r, --referral <referral-code>", "Use the referral code")
    .description("Unstake SOL using liquidity pool")
    .action(liquidUnstakeAction)

  program
    .command("add-liquidity <amount-sol>")
    .description("provide liquidity to the liquidity pool")
    .action(addLiquidityAction)

  program
    .command("remove-liquidity <amount-sol>")
    .description("remove liquidity from the liquidity pool")
    .action(removeLiquidityAction)

  program.parse(argv)
}

main(process.argv, process.env)
