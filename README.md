# marinade-ts-cli
Marinade typescript-based client.

## Quick start

```
git clone https://github.com/marinade-finance/marinade-ts-cli.git
cd marinade-ts-cli
npm install
npm run build
npm link
marinade --help
```

```
Usage: marinade [options] [command]

Options:
  -V, --version                                    output the version number
  -h, --help                                       display help for command

Commands:
  show [options]                                   show marinade state
  show-referral-state <referral>                   show referral partner's state
  balance                                          show your account balances
  deposit-stake-account [options] <stake-account>  deposit stake account
  stake [options] <amount-sol>                     stake SOL
  liquid-unstake [options] <amount-sol>            Unstake SOL using liquidity pool
  add-liquidity <amount-sol>                       provide liquidity to the liquidity pool
  remove-liquidity <amount-sol>                    remove liquidity from the liquidity pool
  help [command]                                   display help for command
```

## Changelog
Version 0.0.1 - add 'balance' instruction
