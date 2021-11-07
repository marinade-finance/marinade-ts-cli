import { MarinadeConfig } from "./modules/marinade-config"
import { BN, Idl, Program, Provider, web3 } from "@project-serum/anchor"
import * as marinadeIdl from "./marinade-idl.json"
import { MarinadeState } from './marinade-state/marinade-state'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { getOrCreateAssociatedTokenAccount, SYSTEM_PROGRAM_ID } from './util/anchor'
import { MarinadeResult } from './marinade.types'

export class Marinade {
  constructor (public readonly config: MarinadeConfig = new MarinadeConfig()) {}

  readonly anchorProvider = Provider.local(this.config.anchorProviderUrl)

  get marinadeProgram (): Program {
    return new Program(
      marinadeIdl as Idl,
      this.config.marinadeProgramId,
      this.anchorProvider,
    )
  }

  async getMarinadeState (): Promise<MarinadeState> {
    return MarinadeState.fetch(this)
  }

  async addLiquidity (amountLamports: BN | number): Promise<MarinadeResult.AddLiquidity> {
    const ownerAddress = this.config.wallet.publicKey
    const marinadeState = await this.getMarinadeState()
    const transaction = new web3.Transaction()

    const {
      associatedTokenAccountAddress,
      createAccociateTokenInstruction,
    } = await getOrCreateAssociatedTokenAccount(this.anchorProvider, marinadeState.lpMintAddress, ownerAddress)

    if (createAccociateTokenInstruction) {
      transaction.add(createAccociateTokenInstruction)
    }

    const addLiquidityInstruction = await this.marinadeProgram.instruction.addLiquidity(
      new BN(amountLamports),
      {
        accounts: {
          state: this.config.marinadeStateAddress,
          lpMint: marinadeState.lpMintAddress,
          lpMintAuthority: marinadeState.lpMintAuthority,

          liqPoolMsolLeg: marinadeState.mSolLeg,
          liqPoolSolLegPda: await marinadeState.solLeg(),

          transferFrom: ownerAddress,
          mintTo: associatedTokenAccountAddress,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    transaction.add(addLiquidityInstruction)
    const transactionSignature = await this.anchorProvider.send(transaction)

    return {
      associatedTokenAccountAddress,
      transactionSignature,
    }
  }
}