import { BN, Provider, web3 } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeMint } from '../marinade-mint/marinade-mint'
import * as StateHelper from '../util/state-helpers'
import { ProgramDerivedAddressSeed, MarinadeStateResponse } from './marinade-state.types'

export class MarinadeState {
  // @todo rework args
  private constructor (
    private readonly marinade: Marinade,
    private readonly anchorProvider: Provider,
    public readonly state: MarinadeStateResponse,
  ) { }

  static async fetch (marinade: Marinade) { // @todo rework args
    const { marinadeProgram, config } = marinade
    const state = await marinadeProgram.account.state.fetch(config.marinadeStateAddress) as MarinadeStateResponse
    return new MarinadeState(marinade, marinade.anchorProvider, state)
  }

  reserveAddress = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.RESERVE_ACCOUNT)

  mSolPrice: number = this.state.msolPrice.toNumber() / 0x1_0000_0000

  mSolMintAddress: web3.PublicKey = this.state.msolMint
  mSolMint = MarinadeMint.build(this.anchorProvider, this.mSolMintAddress)
  mSolMintAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MSOL_MINT_AUTHORITY)
  mSolLegAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MSOL_AUTHORITY)
  mSolLeg = this.state.liqPool.msolLeg

  lpMintAddress: web3.PublicKey = this.state.liqPool.lpMint
  lpMint = MarinadeMint.build(this.anchorProvider, this.lpMintAddress)
  lpMintAuthority = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_MINT_AUTHORITY)

  solLeg = async () => this.findProgramDerivedAddress(ProgramDerivedAddressSeed.LIQ_POOL_SOL_ACCOUNT)

  private async findProgramDerivedAddress (seed: ProgramDerivedAddressSeed): Promise<web3.PublicKey> {
    const seeds = [this.marinade.config.marinadeStateAddress.toBuffer(), Buffer.from(seed)]
    const [result] = await web3.PublicKey.findProgramAddress(seeds, this.marinade.config.marinadeProgramId)
    return result
  }

  async unstakeNowFeeBp (lamportsToObtain: BN): Promise<number> {
    const mSolMintClient = this.mSolMint.mintClient()
    const mSolLegInfo = await mSolMintClient.getAccountInfo(this.mSolLeg)
    const lamportsAvailable = mSolLegInfo.amount

    return StateHelper.unstakeNowFeeBp(
      this.state.liqPool.lpMinFee.basisPoints,
      this.state.liqPool.lpMaxFee.basisPoints,
      this.state.liqPool.lpLiquidityTarget,
      lamportsAvailable,
      lamportsToObtain,
    )
  }

  treasuryMsolAccount: web3.PublicKey = this.state.treasuryMsolAccount

  /**
   * Commission in %
   */
  rewardsCommissionPercent: number = this.state.rewardFee.basisPoints / 100
}
