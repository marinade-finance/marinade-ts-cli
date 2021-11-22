import { web3 } from "@project-serum/anchor"
const dotenv = require('dotenv');
dotenv.config();

const loadEnvVariable = (envVariableKey: string, defValue: string): string => process.env[envVariableKey] ?? defValue

export class MarinadeConfig {
  marinadeProgramId = new web3.PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD")
  marinadeStateAddress = new web3.PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC")
  // anchorProviderUrl = loadEnvVariable("ANCHOR_PROVIDER_URL", "https://api.mainnet-beta.solana.com")
  anchorProviderUrl = loadEnvVariable("ANCHOR_PROVIDER_URL", "https://api.devnet.solana.com")
  wallet = web3.Keypair.generate()

  constructor (configOverrides: Partial<MarinadeConfig> = {}) {
    Object.assign(this, configOverrides)
  }
}
