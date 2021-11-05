import { web3 } from "@project-serum/anchor"

const loadEnvVariable = (envVariableKey: string, defValue: string): string => process.env[envVariableKey] ?? defValue

export class Config {
  marinadeProgramId = new web3.PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD")
  marinadeStateAddress = new web3.PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC")
  anchorProviderUrl = loadEnvVariable("ANCHOR_PROVIDER_URL", "http://api.mainnet-beta.solana.com")

  constructor (configOverrides: Partial<Config> = {}) {
    Object.assign(this, configOverrides)
  }
}
