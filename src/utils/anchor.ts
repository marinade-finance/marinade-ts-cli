import { Provider, Wallet, web3 } from '@marinade.finance/marinade-ts-sdk'

export const PROVIDER_URL = 'https://api.devnet.solana.com'
export const connection = new web3.Connection(PROVIDER_URL)
export const provider = new Provider(
  connection,
  Wallet.local(),
  { commitment: 'confirmed' },
)
