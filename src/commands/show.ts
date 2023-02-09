import { program } from "commander"
import { Marinade, MarinadeUtils, BN, MarinadeConfig, MarinadeBorsh, MarinadeState } from '@marinade.finance/marinade-ts-sdk'
import { getConnection } from '../utils/anchor'
import { getProvider } from '@project-serum/anchor'

const aligned = (label:string, n: number) => label.slice(0,20).padEnd(20)+":"+n.toLocaleString().padStart(20)

// debug
// const showBN = (label:string, bn: BN) => console.log(label.slice(0,40).padEnd(20)+":"+ MarinadeUtils.lamportsToSol(bn).toLocaleString().padStart(20))

export async function show(options: Object): Promise<void> {

  const provider = getProvider()
  const config = new MarinadeConfig({ connection: provider.connection })
  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState()

  const {
    state,
    lpMint,
    mSolMint,
    mSolMintAddress,
    mSolPrice,
    mSolLeg, // @todo fetch from Marinade instead for MarinadeState? This should be configurable https://docs.marinade.finance/developers/contract-addresses
    treasuryMsolAccount,
    rewardsCommissionPercent,
  } = marinadeState

  const mSolMintClient = mSolMint.mintClient()
  const mSolMintSupply = await mSolMint.totalSupply()

  const lpMintClient = lpMint.mintClient()
  const lpMintInfo = await lpMintClient.getMintInfo()
  const lpMintSupply = await lpMint.totalSupply()

  const mSolLegInfo = await mSolMintClient.getAccountInfo(state.liqPool.msolLeg)
  const mSolLegBalance = mSolLegInfo.amount

  const solLeg = await marinadeState.solLeg() // @todo fetch from Marinade instead?, rm await
  const solLegBalance = new BN(await provider.connection.getBalance(solLeg)).sub(state.rentExemptForTokenAcc)

  const tvlStaking = MarinadeUtils.lamportsToSol(
    state.validatorSystem.totalActiveBalance
      .add(state.availableReserveBalance)
      .add(state.emergencyCoolingDown)
  )
  
  const totalLiqPoolValueLamports = solLegBalance.add(mSolLegBalance.muln(mSolPrice))
  const tvlLiquidity = Math.round(MarinadeUtils.lamportsToSol(totalLiqPoolValueLamports))

  const emergencyUnstaking  = Math.round(MarinadeUtils.lamportsToSol(state.emergencyCoolingDown))

  // LPPrice * 1e9 (expressed in lamports)
  const LAMPORTS_PER_SOL = new BN(1e9)
  const LPPrice = totalLiqPoolValueLamports.mul(LAMPORTS_PER_SOL).div(lpMintInfo.supply)

  //console.log(state) // Access to raw internal structure is allowed

  console.log("Marinade.Finance ProgramId", marinade.config.marinadeFinanceProgramId.toBase58())
  console.log("Marinade.Finance State acc", marinade.config.marinadeStateAddress.toBase58())
  console.log("Marinade.Finance admin auth", state.adminAuthority.toBase58())
  console.log()

  console.log("mSOL mint", mSolMintAddress.toBase58())
  console.log("mSOL supply", mSolMintSupply)
  console.log("mSol Price", mSolPrice, "SOL")
  console.log("Accumulated rewards", (mSolMintSupply * (mSolPrice - 1)), "SOL")
  console.log()

  console.log("Treasury mSOL account", treasuryMsolAccount.toBase58())
  console.log("Rewards commission", rewardsCommissionPercent, "%")
  console.log("Liquid-unstake Treasury cut", state.liqPool.treasuryCut, "%")
  console.log("Stake Account Count", state.stakeSystem.stakeList.count)
  console.log("Min Stake Amount", MarinadeUtils.lamportsToSol(state.stakeSystem.minStake), "SOL")
  console.log(`Stake Delta Window: ${state.stakeSystem.slotsForStakeDelta} slots, ${state.stakeSystem.slotsForStakeDelta.toNumber() / 100} minutes`)
  console.log("Emergency unstaking:", emergencyUnstaking.toLocaleString(), "SOL")
  console.log()

  console.log("--- mSOL-SOL swap pool")
  console.log("LP Mint", marinadeState.lpMintAddress.toBase58())
  console.log("  LP supply: ", lpMintSupply)

  console.log("  SOL leg Balance:", MarinadeUtils.lamportsToSol(solLegBalance), "account:",solLeg.toBase58())
  console.log("  mSOL leg Balance", MarinadeUtils.lamportsToSol(mSolLegBalance),"account:",mSolLeg.toBase58())
  console.log("  Total Liq pool value", MarinadeUtils.lamportsToSol(totalLiqPoolValueLamports), "SOL")
  console.log("  mSOL-SOL-LP price", MarinadeUtils.lamportsToSol(LPPrice), "SOL")

  console.log("  Liquidity Target: ", MarinadeUtils.lamportsToSol(state.liqPool.lpLiquidityTarget))
  // compute the fee to unstake-now! and get 1 SOL
  console.log(`  Current-fee: ${await marinadeState.unstakeNowFeeBp(MarinadeUtils.solToLamports(1)) / 100}%`)
  console.log(`  Min-Max-Fee: ${state.liqPool.lpMinFee.basisPoints / 100}% to ${state.liqPool.lpMaxFee.basisPoints / 100}%`)
  const testAmount = 10000
  console.log(`  fee to unstake-now! ${testAmount} SOL: ${await marinadeState.unstakeNowFeeBp(MarinadeUtils.solToLamports(testAmount)) / 100}%`)
  console.log()

  console.log("--- TVL")
  // debug
  // showBN("state.validatorSystem.totalActiveBalance",state.validatorSystem.totalActiveBalance)
  // showBN("state.availableReserveBalance",state.availableReserveBalance)
  // showBN("sum",state.validatorSystem.totalActiveBalance.add(state.availableReserveBalance))
  // showBN("state.emergencyCoolingDown",state.emergencyCoolingDown)
  // showBN("state.stakeSystem.delayedUnstakeCoolingDown",state.stakeSystem.delayedUnstakeCoolingDown)

  console.log(aligned("TVL Staking", tvlStaking), "SOL")
  console.log(aligned("TVL Liquidity-Pool", tvlLiquidity), "SOL")
  console.log(aligned("Total TVL", tvlStaking + tvlLiquidity), "SOL")

  if ('list' in options) {
    await listValidatorsWithStake(marinadeState);
  }
}

async function listValidatorsWithStake(marinadeState: MarinadeState) {
  const { state } = marinadeState
  const { validatorRecords, capacity: validatorCapacity } = await marinadeState.getValidatorRecords()
  const { stakeInfos, capacity: stakeCapacity } = await marinadeState.getStakeInfos()

  console.log()
  console.log("  Validator_manager_authority", state.validatorSystem.managerAuthority.toBase58())
  console.log(`  Stake list account: ${state.stakeSystem.stakeList.account} with ${state.stakeSystem.stakeList.count}/${stakeCapacity} stakes`)
  console.log("-----------------")
  console.log("-- Validators ---")
  console.log(`  Total staked: ${MarinadeUtils.lamportsToSol(state.validatorSystem.totalActiveBalance)} SOL  (Note:4~5% from total TVL is usually rebalancing)`)
  console.log(`  List account: ${state.validatorSystem.validatorList.account} with ${state.validatorSystem.validatorList.count}/${validatorCapacity} validators`)
  console.log("-------------------------------------------------------------")

  const epochInfo = await marinadeState.epochInfo()

  let totalStaked = new BN(0)
  let totalStakedFullyActivated = new BN(0)

  // Filter active validator & stakeInfo
  const activeValidatorRecordWithIndexes = validatorRecords
    .map((value, index) => { return { validatorRecord: value, validatorIndex: index } })
    .filter(validator => validator.validatorRecord.activeBalance.toNumber() > 0)
  const activeStakeInfos = stakeInfos
    .filter(stakeInfo => stakeInfo.stake.Stake?.stake.delegation)
    .filter(stakeInfo => MarinadeUtils.U64_MAX.eq(stakeInfo.stake.Stake?.stake.delegation.deactivationEpoch as BN))

  activeValidatorRecordWithIndexes.forEach((validatorWithIndex) => {
    // Find stakeInfo by delegation for current validatorWithIndex
    const validatorStakes: MarinadeBorsh.StakeInfo[] = activeStakeInfos
      .filter(stakeInfo => stakeInfo.stake.Stake?.stake.delegation.voterPubkey.toBase58() == validatorWithIndex.validatorRecord.validatorAccount.toBase58())
    const validatorScorePercent = validatorWithIndex.validatorRecord.score * 100 / state.validatorSystem.totalValidatorScore;

    console.log(`${validatorWithIndex.validatorIndex + 1}) Validator ${validatorWithIndex.validatorRecord.validatorAccount.toBase58()}`
      + `, marinade-staked ${MarinadeUtils.lamportsToSol(validatorWithIndex.validatorRecord.activeBalance).toFixed(2)} SOL`
      + `, score-pct: ${validatorScorePercent.toFixed(4)}%, ${validatorStakes.length} stake-accounts`)

    for (const [index, stakeInfo] of validatorStakes.entries()) {

      let delegation = stakeInfo.stake.Stake?.stake.delegation as MarinadeBorsh.Delegation
      let meta = stakeInfo.stake.Stake?.meta as MarinadeBorsh.Meta
      let extraBalance = MarinadeUtils.lamportsToSol(stakeInfo.balance.sub(delegation.stake).sub(meta.rentExemptReserve))

      console.log(`  ${stakeInfo.index}. Stake ${stakeInfo.record.stakeAccount.toBase58()} delegated`
        + ` ${MarinadeUtils.lamportsToSol(delegation?.stake as BN)} activation_epoch:${delegation.activationEpoch}`
        + (extraBalance > 0 ? ` (extra balance ${extraBalance})` : ""))

      totalStaked = totalStaked.add(delegation.stake)
      if (delegation.activationEpoch.toNumber() < epochInfo.epoch - 1) {
        totalStakedFullyActivated = totalStakedFullyActivated.add(delegation.stake)
      }
    }
    console.log("-------------------------")
  })

  console.log(` ${activeValidatorRecordWithIndexes.length} validators with stake`
    + `, total_staked ${MarinadeUtils.lamportsToSol(new BN(totalStaked))}`
    + `, total_staked_fully_activated ${MarinadeUtils.lamportsToSol(new BN(totalStakedFullyActivated))}`
    + `, warming-up in this epoch:${MarinadeUtils.lamportsToSol(totalStaked.sub(totalStakedFullyActivated))}`)

  // find cooling down stakes by empty delegation or deactivationEpoch != U64_MAX
  let coolingDownStakes: MarinadeBorsh.StakeInfo[] = stakeInfos
    .filter(stakeInfo => !stakeInfo.stake.Stake?.stake.delegation
      || !MarinadeUtils.U64_MAX.eq(stakeInfo.stake.Stake?.stake.delegation.deactivationEpoch as BN))
  if (coolingDownStakes.length > 0) {
    console.log("-------------------------")
    console.log("-- Cooling down stakes --")

    coolingDownStakes.forEach(stakeInfo => {
      let delegation = stakeInfo.stake.Stake?.stake.delegation
      if (delegation) {
        let meta = stakeInfo.stake.Stake?.meta as MarinadeBorsh.Meta
        let extraBalance = MarinadeUtils.lamportsToSol(stakeInfo.balance.sub(delegation.stake).sub(meta.rentExemptReserve))

        console.log(`  ${stakeInfo.index}. Stake ${stakeInfo.record.stakeAccount.toBase58()} delegated`
          + ` ${MarinadeUtils.lamportsToSol(delegation?.stake as BN)} to ${delegation.voterPubkey.toBase58()}`
          + (extraBalance > 0 ? ` (extra balance ${extraBalance})` : ""))
      } else {
        console.log(`  ${stakeInfo.index}. Stake ${stakeInfo.record.stakeAccount.toBase58()} (full balance ${stakeInfo.balance})`)
      }
    })
  }
}
