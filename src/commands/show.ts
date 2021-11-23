import BN from 'bn.js'
import { Marinade } from '../marinade'
import { lamportsToSol, solToLamports } from '../util/conversion'

export const show = async (options: Object): Promise<void> => {
  const marinade = new Marinade()
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
  const mSolMintBalance = await mSolMint.tokenBalance()

  const lpMintClient = lpMint.mintClient()
  const lpMintInfo = await lpMintClient.getMintInfo()
  const lpMintBalance = await lpMint.tokenBalance()

  const mSolLegInfo = await mSolMintClient.getAccountInfo(state.liqPool.msolLeg)
  const mSolLegBalance = mSolLegInfo.amount

  const solLeg = await marinadeState.solLeg() // @todo fetch from Marinade instead?, rm await
  const solLegBalance = new BN(await marinade.anchorProvider.connection.getBalance(solLeg)).sub(state.rentExemptForTokenAcc)

  const tvlStaked = Math.round(mSolMintBalance * mSolPrice) // @todo move as getter to MarinadeState
  const totalLiqPoolValue = solLegBalance.add(mSolLegBalance.muln(mSolPrice))
  const tvlLiquidity = Math.round(lamportsToSol(totalLiqPoolValue))

  const LPPrice = totalLiqPoolValue.mul(new BN(10 ** lpMintInfo.decimals)).div(lpMintInfo.supply)

  console.log(state) // Access to raw internal structure is allowed

  console.log("Marinade.Finance ProgramId", marinade.config.marinadeProgramId.toBase58())
  console.log("Marinade.Finance State", marinade.config.marinadeStateAddress.toBase58())
  console.log()

  console.log("mSOL mint", mSolMintAddress.toBase58())
  console.log("mSOL supply", mSolMintBalance)
  console.log()

  console.log("Treasury mSOL account", treasuryMsolAccount.toBase58())
  console.log("Rewards commission", rewardsCommissionPercent, "%")
  console.log("Stake Account Count", state.stakeSystem.stakeList.count)
  console.log("Min Stake Amounts", lamportsToSol(state.stakeSystem.minStake))
  console.log()

  console.log("mSol Price", mSolPrice)
  console.log()

  console.log("--- mSOL-SOL swap pool")
  console.log("LP Mint", marinadeState.lpMintAddress.toBase58())
  console.log("  LP supply: ", lpMintBalance)

  console.log("  SOL leg", solLeg.toBase58())
  console.log("  SOL leg Balance", lamportsToSol(solLegBalance))

  console.log("  mSOL leg", mSolLeg.toBase58())
  console.log("  mSOL leg Balance", lamportsToSol(mSolLegBalance))

  console.log("  Total Liq pool value (SOL) ", lamportsToSol(totalLiqPoolValue))
  console.log("  mSOL-SOL-LP price (SOL)", lamportsToSol(LPPrice))

  console.log("  Liquidity Target: ", lamportsToSol(state.liqPool.lpLiquidityTarget))
  // compute the fee to unstake-now! and get 1 SOL
  console.log(`  Current-fee: ${await marinadeState.unstakeNowFeeBp(solToLamports(1)) / 100}%`)
  console.log(`  Min-Max-Fee: ${state.liqPool.lpMinFee.basisPoints / 100}% to ${state.liqPool.lpMaxFee.basisPoints / 100}%`)
  const testAmount = 250000
  console.log(`  fee to unstake-now! ${testAmount} SOL: ${await marinadeState.unstakeNowFeeBp(solToLamports(testAmount)) / 100}%`)
  console.log()

  console.log("--- TVL")
  console.log("  Total Staked Value (SOL) ", tvlStaked.toLocaleString())
  console.log("  Total Liquidity-Pool (SOL) ", tvlLiquidity.toLocaleString())
  console.log("  TVL (SOL) ", (tvlStaked + tvlLiquidity).toLocaleString())

  if ('list' in options) {
    console.log()
    console.log("  Validator_manager_authority", state.validatorSystem.managerAuthority.toBase58())
    console.log(`  Stake list account: ${state.stakeSystem.stakeList.account} with ${state.stakeSystem.stakeList.count}/${"?"} stakes`)
    console.log("-----------------")
    console.log("-- Validators ---")
    console.log(`  Total staked: ${lamportsToSol(state.validatorSystem.totalActiveBalance)} SOL`)
    console.log(`  List account: ${state.validatorSystem.validatorList.account} with ${state.validatorSystem.validatorList.count}/${"?"} validators`)
    console.log("-------------------------------------------------------------")

    let totalStaked = 0;
    let totalStakedFullyActivated = 0;
    const epochInfo = await marinadeState.epochInfo();

    const validatorAccounts = await marinadeState.validatorRecordList();
    const stakeAccountList = await marinadeState.stakeRecordList();

    const stakeDelegationList = await marinadeState.stakeDelegationList();
    validatorAccounts.forEach((validator, validatorIndex) => {
      if (validator.active_balance.toNumber() <= 0) return;

      const validatorStakeDelegationList = stakeDelegationList.filter(delegation => delegation.voter === validator.validator_account.value.toBase58())
      console.log(`${validatorIndex+1}) Validator ${state.validatorSystem.validatorList.account}`
          + `, marinade-staked ${lamportsToSol(state.validatorSystem.totalActiveBalance)} SOL`
          + `, score-pct:, ${validatorStakeDelegationList.length} stake-accounts`);

      for (const [index, delegation] of validatorStakeDelegationList.entries()) {
        // let extra_balance = lamportsToSol(
        //     delegation.balance
        //     - delegation.stake
        //     - stake.stake.meta().unwrap().rent_exempt_reserve,
        // );
        // if extra_balance > 0.0 {
        //   print!(" (extra balance {})", extra_balance);
        // }

        console.log(`  ${index}. Stake ${stakeAccountList[index].stake_account.value.toBase58()} delegated`
            + ` ${lamportsToSol(new BN(delegation.stake))} activation_epoch:${delegation.activationEpoch}`)
        totalStaked += Number(delegation.stake);
        if (Number(delegation.activationEpoch) < epochInfo.epoch - 1) {
          totalStakedFullyActivated += Number(delegation.stake);
        }
      }
    })
    console.log("-------------------------------------------------------------")
    console.log(`${validatorAccounts.length} validators with stake`
        + `, total_staked ${lamportsToSol(new BN(totalStaked))} total_staked_fully_activated ${lamportsToSol(new BN(totalStakedFullyActivated))}`
        + `, warming-up in this epoch:${lamportsToSol(new BN(totalStaked - totalStakedFullyActivated))}`)
  }
}
