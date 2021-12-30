import { Provider, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import * as path from 'path'

export function getUserRootFolder():string {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || `~`;
}

export function getProviderUrl():string {
  if (!process.env.ANCHOR_PROVIDER_URL) {
    process.env.ANCHOR_PROVIDER_URL = 'https://api.mainnet-beta.solana.com'
  }
  return process.env.ANCHOR_PROVIDER_URL
}

export function getConnection(){
  return new web3.Connection(getProviderUrl())
}

export function getNodeJsLocalWallet(): Wallet {
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = path.join(getUserRootFolder(), ".config", "solana", "id.json")
  }
  return Wallet.local()
}

export function getNodeJsProvider(): Provider {
  return new Provider(
    getConnection(),
    getNodeJsLocalWallet(),
    { commitment: 'confirmed' },
  )
}

