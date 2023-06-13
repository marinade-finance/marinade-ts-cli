# marinade-ts-cli

Marinade typescript based CLI for user commands.

## Quick start

```bash
npm i -g @marinade.finance/marinade-ts-cli
marinade --help
```

```
Usage: marinade [options] [command]

Options:
  -V, --version                                    output the version number
  -u, --url <url-or-moniker>                       URL of Solana cluster or moniker (m/mainnet/mainnet-beta, d/devnet, t/testnet) (default: "m")
  --commitment <commitment>                        Commitment (default: "confirmed")
  -k, --keypair <keypair-or-ledger>                Wallet keypair (path or ledger url in format usb://ledger/[<pubkey>][?key=<derivedPath>])  (default: ~/.config/solana/id.json)
  -s, --simulate                                   Simulate (default: false)
  -p, --print-only                                 Print only mode, no execution, instructions are printed in base64 to output. This can be used for placing the admin commands to SPL Governance UI by hand. (default: false)
  --skip-preflight                                 setting transaction execution flag "skip-preflight" (default: false)
  -d, --debug                                      Debug (default: false)
  -h, --help                                       display help for command

Commands:
  balance <account-pubkey>                         Show account balance
  show-referral-state <referral-code>              Show Marinade referral partner's state
  show [options]                                   Show marinade state
  add-liquidity <amount-sol>                       Provide liquidity to the liquidity pool
  remove-liquidity <amount-sol>                    Remove liquidity from the liquidity pool
  deposit [options] <amount-sol>                   deposit SOL
  liquid-unstake [options] <amount-msol>           Unstake mSOL using liquidity pool
  deposit-stake-account [options] <stake-account>  deposit stake account
  help [command]                                   display help for command
```

## Develop & Test

```bash
git clone https://github.com/marinade-finance/marinade-ts-cli.git
cd marinade-ts-cli
pnpm install

pnpm cli --help

# to test Solana CLI tools and Anchor in version 0.28.0 is required
pnpm test
```
