import { Provider, web3 } from '@project-serum/anchor'
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'

// @todo add payer argument
export const mintClient = (anchorProvider: Provider, mintAddress: web3.PublicKey): Token => {
  return new Token(anchorProvider.connection, mintAddress, TOKEN_PROGRAM_ID, web3.Keypair.generate())
}
