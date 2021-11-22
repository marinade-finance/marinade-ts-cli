import { Provider, web3 } from '@project-serum/anchor'
import * as anchor from '@project-serum/anchor'
import { AccountInfo, ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'

export const SYSTEM_PROGRAM_ID = new web3.PublicKey('11111111111111111111111111111111')
export const STAKE_PROGRAM_ID = new web3.PublicKey('Stake11111111111111111111111111111111111111')

export function getMintClient (anchorProvider: Provider, mintAddress: web3.PublicKey): Token {
  return new Token(anchorProvider.connection, mintAddress, TOKEN_PROGRAM_ID, web3.Keypair.generate())
}

export async function getAssociatedTokenAccountAddress (mint: web3.PublicKey, owner: web3.PublicKey): Promise<web3.PublicKey> {
  return anchor.utils.token.associatedAddress({ mint, owner })
}

export async function getTokenAccountInfo (mintClient: Token, publicKey: web3.PublicKey): Promise<AccountInfo> {
  return mintClient.getAccountInfo(publicKey)
}

export async function getOrCreateAssociatedTokenAccount (anchorProvider: anchor.Provider, mintAddress: web3.PublicKey, ownerAddress: web3.PublicKey): Promise<{
  associatedTokenAccountAddress: web3.PublicKey
  createAssociateTokenInstruction: web3.TransactionInstruction | null
}> {
  const associatedTokenAccountAddress = await getAssociatedTokenAccountAddress(mintAddress, ownerAddress)
  let createAssociateTokenInstruction: web3.TransactionInstruction | null = null

  const mintClient = getMintClient(anchorProvider, mintAddress)

  try {
    await getTokenAccountInfo(mintClient, associatedTokenAccountAddress)
  } catch (err) {
    if (!(err instanceof Error) || err.message !== 'Failed to find account') {
      throw err
    }

    createAssociateTokenInstruction = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintAddress,
      associatedTokenAccountAddress,
      ownerAddress,
      anchorProvider.wallet.publicKey
    )
  }

  return {
    associatedTokenAccountAddress,
    createAssociateTokenInstruction,
  }
}