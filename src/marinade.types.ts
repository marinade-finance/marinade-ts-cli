import { web3 } from '@project-serum/anchor'

export namespace MarinadeResult {
  export interface AddLiquidity {
    associatedTokenAccountAddress: web3.PublicKey
    transactionSignature: any
  }
}
