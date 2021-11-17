import { web3 } from '@project-serum/anchor'

export namespace MarinadeResult {
  export interface AddLiquidity {
    associatedLPTokenAccountAddress: web3.PublicKey
    transactionSignature: any
  }

  export interface RemoveLiquidity {
    associatedLPTokenAccountAddress: web3.PublicKey
    associatedMSolTokenAccountAddress: web3.PublicKey
    transactionSignature: any
  }

  export interface Stake {
    associatedMSolTokenAccountAddress: web3.PublicKey
    transactionSignature: any
  }
}
