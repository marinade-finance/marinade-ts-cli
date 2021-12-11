import { Provider, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'
import * as path from 'path'

export const PROVIDER_URL = 'https://api.devnet.solana.com'
export const connection = new web3.Connection(PROVIDER_URL)

export function getUserRootFolder():string {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE || `~`;
}

export function getNodeJsLocalWallet(): Wallet {
  if (!process.env.ANCHOR_WALLET) {
    process.env.ANCHOR_WALLET = path.join(getUserRootFolder(), ".config", "solana", "id.json")
  }
  return Wallet.local()
}

export function getNodeJsProvider(): Provider {
  return new Provider(
    connection,
    getNodeJsLocalWallet(),
    { commitment: 'confirmed' },
  )
}

