import { MarinadeConfig } from "./modules/marinade-config"
import { BN, Idl, Program, Provider, web3 } from "@project-serum/anchor"
import * as marinadeIdl from "./marinade-idl.json"
import { MarinadeState } from './marinade-state/marinade-state'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { getAssociatedTokenAccountAddress, getOrCreateAssociatedTokenAccount, SYSTEM_PROGRAM_ID } from './util/anchor'
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

  async addLiquidity (amountLamports: BN): Promise<MarinadeResult.AddLiquidity> {
    const ownerAddress = this.config.wallet.publicKey
    const marinadeState = await this.getMarinadeState()
    const transaction = new web3.Transaction()

    const {
      associatedTokenAccountAddress: associatedLPTokenAccountAddress,
      createAssociateTokenInstruction,
    } = await getOrCreateAssociatedTokenAccount(this.anchorProvider, marinadeState.lpMintAddress, ownerAddress)

    if (createAssociateTokenInstruction) {
      transaction.add(createAssociateTokenInstruction)
    }

    const addLiquidityInstruction = await this.marinadeProgram.instruction.addLiquidity(
      amountLamports,
      {
        accounts: {
          state: this.config.marinadeStateAddress,
          lpMint: marinadeState.lpMintAddress,
          lpMintAuthority: await marinadeState.lpMintAuthority(),
          liqPoolMsolLeg: marinadeState.mSolLeg,
          liqPoolSolLegPda: await marinadeState.solLeg(),
          transferFrom: ownerAddress,
          mintTo: associatedLPTokenAccountAddress,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    transaction.add(addLiquidityInstruction)
    const transactionSignature = await this.anchorProvider.send(transaction)

    return {
      associatedLPTokenAccountAddress,
      transactionSignature,
    }
  }

  async removeLiquidity (amountLamports: BN ): Promise<MarinadeResult.RemoveLiquidity> {
    const ownerAddress = this.config.wallet.publicKey
    const marinadeState = await this.getMarinadeState()
    const transaction = new web3.Transaction()

    const associatedLPTokenAccountAddress = await getAssociatedTokenAccountAddress(marinadeState.lpMintAddress, ownerAddress)

    const {
      associatedTokenAccountAddress: associatedMSolTokenAccountAddress,
      createAssociateTokenInstruction,
    } = await getOrCreateAssociatedTokenAccount(this.anchorProvider, marinadeState.mSolMintAddress, ownerAddress)

    if (createAssociateTokenInstruction) {
      transaction.add(createAssociateTokenInstruction)
    }
    const removeLiquidityInstruction = await this.marinadeProgram.instruction.removeLiquidity(
      amountLamports,
      {
        accounts: {
          state: this.config.marinadeStateAddress,
          lpMint: marinadeState.lpMintAddress,
          burnFrom: associatedLPTokenAccountAddress,
          burnFromAuthority: this.config.wallet.publicKey,
          liqPoolSolLegPda: await marinadeState.solLeg(),
          transferSolTo: ownerAddress,
          transferMsolTo: associatedMSolTokenAccountAddress,
          liqPoolMsolLeg: marinadeState.mSolLeg,
          liqPoolMsolLegAuthority: await marinadeState.mSolLegAuthority(),
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    transaction.add(removeLiquidityInstruction)
    const transactionSignature = await this.anchorProvider.send(transaction)

    return {
      associatedLPTokenAccountAddress,
      associatedMSolTokenAccountAddress,
      transactionSignature,
    }
  }

  async deposit (amountLamports: BN): Promise<MarinadeResult.Deposit> {
    const ownerAddress = this.config.wallet.publicKey
    const marinadeState = await this.getMarinadeState()
    const transaction = new web3.Transaction()

    const {
      associatedTokenAccountAddress: associatedMSolTokenAccountAddress,
      createAssociateTokenInstruction,
    } = await getOrCreateAssociatedTokenAccount(this.anchorProvider, marinadeState.mSolMintAddress, ownerAddress)

    if (createAssociateTokenInstruction) {
      transaction.add(createAssociateTokenInstruction)
    }

    const depositInstruction = await this.marinadeProgram.instruction.deposit(
      amountLamports,
      {
        accounts: {
          reservePda: await marinadeState.reserveAddress(),
          state: this.config.marinadeStateAddress,
          msolMint: marinadeState.mSolMintAddress,
          msolMintAuthority: await marinadeState.mSolMintAuthority(),
          liqPoolMsolLegAuthority: await marinadeState.mSolLegAuthority(),
          liqPoolMsolLeg: marinadeState.mSolLeg,
          liqPoolSolLegPda: await marinadeState.solLeg(),
          mintTo: associatedMSolTokenAccountAddress,
          transferFrom: ownerAddress,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    transaction.add(depositInstruction)
    const transactionSignature = await this.anchorProvider.send(transaction)

    return {
      associatedMSolTokenAccountAddress,
      transactionSignature,
    }
  }

  async liquidUnstake (amountLamports: BN): Promise<MarinadeResult.LiquidUnstake> {
    const ownerAddress = this.config.wallet.publicKey
    const marinadeState = await this.getMarinadeState()
    const transaction = new web3.Transaction()

    const {
      associatedTokenAccountAddress: associatedMSolTokenAccountAddress,
      createAssociateTokenInstruction,
    } = await getOrCreateAssociatedTokenAccount(this.anchorProvider, marinadeState.mSolMintAddress, ownerAddress)

    if (createAssociateTokenInstruction) {
      transaction.add(createAssociateTokenInstruction)
    }

    const depositInstruction = await this.marinadeProgram.instruction.liquidUnstake(
      amountLamports,
      {
        accounts: {
          state: this.config.marinadeStateAddress,
          msolMint: marinadeState.mSolMintAddress,
          liqPoolMsolLeg: marinadeState.mSolLeg,
          liqPoolSolLegPda: await marinadeState.solLeg(),
          getMsolFrom: associatedMSolTokenAccountAddress,
          getMsolFromAuthority: ownerAddress,
          transferSolTo: ownerAddress,
          treasuryMsolAccount: marinadeState.treasuryMsolAccount,
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    transaction.add(depositInstruction)
    const transactionSignature = await this.anchorProvider.send(transaction)

    return {
      associatedMSolTokenAccountAddress,
      transactionSignature,
    }
  }
}