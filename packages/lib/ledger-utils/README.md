# ledger-utils

[`@marinade.finance/ledger-utils`](https://www.npmjs.com/package/@marinade.finance/ledger-utils)

Ledger utilities when used ledger in CLI.

It tries to parse string as input string as an URL derivation path.
Parsing tries to be compatible with solana CLI https://github.com/solana-labs/solana/blob/v1.14.19/clap-utils/src/keypair.rs#L613.

Derivation path consists of the "44'" part that signifies the BIP44 standard, and the "501'" part that signifies the Solana's BIP44 coin type.

Parsing works in kind of following way.

* `usb://ledger` - taking first device and using solana default derivation path `44/501/0/0`
* `usb://ledger?key=0/1` - taking first device and using solana derivation path `44/501/0/1`
* `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd` - searching of all ledger devices where solana default derivation path `44/501/0/0` will result in public key `9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd`
* `usb://ledger/9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd?key=0/1` - searching of all ledger devices where solana derivation path `44/501/0/1` will result in public key `9rPVSygg3brqghvdZ6wsL2i5YNQTGhXGdJzF65YxaCQd`
