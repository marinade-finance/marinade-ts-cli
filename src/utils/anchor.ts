import { Provider, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import * as path from 'path'

export function getUserRootFolder(): string {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || `~`;
}

export function getProviderUrl(options: Record<string,any>): string {
  // override process.env.ANCHOR_PROVIDER_URL
  if (options.u || !process.env.ANCHOR_PROVIDER_URL) {
    // select based on -u m|d|t
    let url =
      options.u == "d" ? 'devnet'
        : options.u == "t" ? 'testnet'
        : options.u == "m" ? 'mainnet-beta'
        : options.u;
    if (url && !url.startsWith("http")) { url=`https://api.${url}.solana.com`}
    process.env.ANCHOR_PROVIDER_URL = url;
  }
  return process.env.ANCHOR_PROVIDER_URL||""
}

export function getConnection(options: Record<string,any>) {
  return new web3.Connection(getProviderUrl(options))
}

export function getNodeJsLocalWallet(): Wallet {
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = path.join(getUserRootFolder(), ".config", "solana", "id.json")
  }
  return Wallet.local()
}

export function getNodeJsProvider(options: Record<string,any>): Provider {
  return new Provider(
    getConnection(options),
    getNodeJsLocalWallet(),
    { commitment: 'confirmed' },
  )
}

