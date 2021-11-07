import { Provider, web3 } from '@project-serum/anchor'
import { Marinade } from '../marinade'
import { MarinadeMint } from '../marinade-mint/marinade-mint'
import { MarinadeStateResponse } from './marinade-state.types'

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

  mSolPrice: number = this.state.msolPrice.toNumber() / 0x1_0000_0000

  mSolMintAddress: web3.PublicKey = this.state.msolMint
  mSolMint = MarinadeMint.build(this.anchorProvider, this.mSolMintAddress)

  lpMintAddress: web3.PublicKey = this.state.liqPool.lpMint
  lpMintAuthority: web3.PublicKey = new web3.PublicKey('HZsepB79dnpvH6qfVgvMpS738EndHw3qSHo4Gv5WX1KA') // @todo get from config/some other place?
  lpMint = MarinadeMint.build(this.anchorProvider, this.lpMintAddress)

  mSolLeg = this.state.liqPool.msolLeg

  // @todo solLeg = this.state.liqPool.???
  async solLeg () {
    const seeds = [this.marinade.config.marinadeStateAddress.toBuffer(), Buffer.from("liq_sol")]
    const [solLeg] = await web3.PublicKey.findProgramAddress(seeds, this.marinade.config.marinadeProgramId)
    return solLeg
  }

  treasuryMsolAccount: web3.PublicKey = this.state.treasuryMsolAccount

  /**
   * Commission in %
   */
  rewardsCommissionPercent: number = this.state.rewardFee.basisPoints / 100
}
