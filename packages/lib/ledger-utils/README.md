# ledger-utils

[`@marinade.finance/ledger-utils`](https://www.npmjs.com/package/@marinade.finance/ledger-utils)

Ledger utilities when used ledger in CLI.

It tries to parse string as input string as an URL derivation path.
Parsing tries to be compatible with solana CLI https://github.com/solana-labs/solana/blob/v1.14.19/clap-utils/src/keypair.rs#L613.

You can verify if the parsing matches against to run the command `solana-keygen`.
When you find some discrepancy contact us at the [Discord](https://discord.com/invite/6EtUf4Euu6)
or kick off an [issue](https://github.com/marinade-finance/marinade-ts-cli/issues).

```
solana-keygen pubkey usb://ledger
```

## BIP44 address parsing

Derivation path consists of the "44'" part that signifies the BIP44 standard, and the "501'" part that signifies the Solana's BIP44 coin type.

Parsing works in kind of following way.

* `usb://ledger` - taking first device and using solana default derivation path `44/501`
* `usb://ledger?key=0/1` - taking first device and using solana derivation path `44/501/0/1`
* `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd?key=0/1` - searching of all ledger devices where solana derivation path `44/501/0/1` will result in public key `9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd`
* `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd` - searching of all ledger devices where solana default derivation path `44/501/` will result in public key `9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd`.

When the public key is not found at the address then it tries heuristically go through the device BIP addresses while searching for the matching derived path of the provided pubkey.
When a public key address is provided then it start searching through the address space until `44/501/10/10/10` is reached.
You can extend the search space by passing the `key` value of zeros an last digit number.
E.g., `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd?key=0/0/0/3` will be searching for the pubkey `9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd` in ledger derived keys until `44/501/3/3/3/3`.