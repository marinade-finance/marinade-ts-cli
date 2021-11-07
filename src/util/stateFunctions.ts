import { BN } from "@project-serum/anchor";

const LAMPORTS_PER_SOL = 1e9

export function mSolPrice(state: any): number {
  return state.msolPrice.toNumber() / 0x1_0000_0000;
}

///compute a linear fee based on liquidity amount, it goes from fee(0)=max -> fee(x>=target)=min
export function unstake_now_fee_bp(state: any, lamportsAvailable: BN, lamportsToObtain: BN): number {

  // if trying to get more than existing
  if (lamportsToObtain.gte(lamportsAvailable)) {
    return state.liqPool.lpMaxFee.basisPoints;
  }
  // result after operation
  let lamportsAfter = lamportsAvailable.sub(lamportsToObtain);
  // if GTE target => min fee
  if (lamportsAfter.gte(state.liqPool.lpLiquidityTarget)) {
    return state.liqPool.lpMinFee.basisPoints;
  }
  else {
    const delta = state.liqPool.lpMaxFee.basisPoints - state.liqPool.lpMinFee.basisPoints;
    return state.liqPool.lpMaxFee.basisPoints
      - proportional(new BN(delta), lamportsAfter, state.liqPool.lpLiquidityTarget).toNumber()
  }
}

export function proportional(amount: BN, numerator: BN, denominator: BN): BN {
  if (denominator.isZero()) {
    return amount;
  }
  return amount.mul(numerator).div(denominator);
}
