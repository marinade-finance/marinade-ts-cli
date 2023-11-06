import {
  Marinade,
  MarinadeUtils,
  MarinadeConfig,
  MarinadeBorsh,
  MarinadeState,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { BN } from 'bn.js'
import { getMarinadeCliContext } from '../context'
import { parsePubkey } from '@marinade.finance/cli-common'
import { PublicKey } from '@solana/web3.js'

export function installShow(program: Command) {
  program
    .command('show')
    .description('Show marinade state')
    .argument(
      '[state-address]',
      'Address of Marinade state account to be loaded and listed',
      parsePubkey
    )
    .option('-l, --list', 'list marinade validators & stake accounts', false)
    .action(
      async (stateAddress: Promise<PublicKey>, { list }: { list: boolean }) => {
        await show({
          stateAddress: await stateAddress,
          withList: list,
        })
      }
    )
}

async function show({
  stateAddress,
  withList,
}: {
  stateAddress?: PublicKey
  withList: boolean
}) {
  const { connection, logger } = getMarinadeCliContext()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marinadeConfigParams: any = { connection }
  if (stateAddress) {
    marinadeConfigParams['stateAddress'] = stateAddress
  }
  const marinadeConfig = new MarinadeConfig(marinadeConfigParams)
  const marinade = new Marinade(marinadeConfig)
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

  const mSolMintSupply = await mSolMint.totalSupply()

  const lpMintSupply = await lpMint.totalSupply()

  const {
    value: { amount },
  } = await connection.getTokenAccountBalance(state.liqPool.msolLeg)
  const mSolLegBalance = new BN(amount)

  const solLeg = await marinadeState.solLeg() // @todo fetch from Marinade instead?, rm await
  const solLegBalance = new BN(await connection.getBalance(solLeg)).sub(
    state.rentExemptForTokenAcc
  )

  const tvlStaking = MarinadeUtils.lamportsToSol(
    state.validatorSystem.totalActiveBalance
      .add(state.availableReserveBalance)
      .add(state.emergencyCoolingDown)
  )

  const totalLiqPoolValueLamports = solLegBalance.add(
    mSolLegBalance.muln(mSolPrice)
  )
  const tvlLiquidity = Math.round(
    MarinadeUtils.lamportsToSol(totalLiqPoolValueLamports)
  )

  const emergencyUnstaking = Math.round(
    MarinadeUtils.lamportsToSol(state.emergencyCoolingDown)
  )

  // LPPrice * 1e9 (expressed in lamports)
  const LAMPORTS_PER_SOL = new BN(1e9)
  const LPPrice = totalLiqPoolValueLamports
    .mul(LAMPORTS_PER_SOL)
    .divn(lpMintSupply)

  //console.log(state) // Access to raw internal structure is allowed

  console.log(
    'Marinade.Finance ProgramId',
    marinade.config.marinadeFinanceProgramId.toBase58()
  )
  console.log(
    'Marinade.Finance State acc',
    marinade.config.marinadeStateAddress.toBase58()
  )
  console.log('Marinade.Finance admin auth', state.adminAuthority.toBase58())
  console.log()

  console.log('mSOL mint', mSolMintAddress.toBase58())
  console.log('mSOL supply', mSolMintSupply)
  console.log('mSol Price', mSolPrice, 'SOL')
  console.log('Accumulated rewards', mSolMintSupply * (mSolPrice - 1), 'SOL')
  console.log()

  console.log('Treasury mSOL account', treasuryMsolAccount.toBase58())
  console.log('Rewards commission', rewardsCommissionPercent, '%')
  console.log('Liquid-unstake Treasury cut', state.liqPool.treasuryCut, '%')
  console.log('Stake Account Count', state.stakeSystem.stakeList.count)
  console.log(
    'Min Stake Amount',
    MarinadeUtils.lamportsToSol(state.stakeSystem.minStake),
    'SOL'
  )
  console.log(
    `Stake Delta Window: ${state.stakeSystem.slotsForStakeDelta} slots, ${
      state.stakeSystem.slotsForStakeDelta.toNumber() / 100
    } minutes`
  )
  console.log(
    'Emergency unstaking:',
    emergencyUnstaking.toLocaleString(),
    'SOL'
  )
  console.log()

  console.log(
    'Staking SOL cap',
    MarinadeUtils.lamportsToSol(state.stakingSolCap)
  )
  console.log(
    'Validator list item size',
    state.validatorSystem.validatorList.itemSize
  )
  console.log('Stake list item size', state.stakeSystem.stakeList.itemSize)
  console.log('Min deposit', MarinadeUtils.lamportsToSol(state.minDeposit))
  console.log()

  console.log('--- mSOL-SOL swap pool')
  console.log('LP Mint', marinadeState.lpMintAddress.toBase58())
  console.log('  LP supply: ', lpMintSupply)

  console.log(
    '  SOL leg Balance:',
    MarinadeUtils.lamportsToSol(solLegBalance),
    'account:',
    solLeg.toBase58()
  )
  console.log(
    '  mSOL leg Balance',
    MarinadeUtils.lamportsToSol(mSolLegBalance),
    'account:',
    mSolLeg.toBase58()
  )
  console.log(
    '  Total Liq pool value',
    MarinadeUtils.lamportsToSol(totalLiqPoolValueLamports),
    'SOL'
  )
  console.log(
    '  mSOL-SOL-LP price',
    MarinadeUtils.lamportsToSol(LPPrice),
    'SOL'
  )

  console.log(
    '  Liquidity Target: ',
    MarinadeUtils.lamportsToSol(state.liqPool.lpLiquidityTarget)
  )
  // compute the fee to unstake-now! and get 1 SOL
  console.log(
    `  Current-fee: ${
      (await marinadeState.unstakeNowFeeBp(MarinadeUtils.solToLamports(1))) /
      100
    }%`
  )
  console.log(
    `  Min-Max-Fee: ${state.liqPool.lpMinFee.basisPoints / 100}% to ${
      state.liqPool.lpMaxFee.basisPoints / 100
    }%`
  )
  const testAmount = 10000
  console.log(
    `  fee to unstake-now! ${testAmount} SOL: ${
      (await marinadeState.unstakeNowFeeBp(
        MarinadeUtils.solToLamports(testAmount)
      )) / 100
    }%`
  )
  console.log(
    `  Delayed Unstake Fee: ${state.delayedUnstakeFee.bpCents / 10000}%`
  )
  console.log(
    `  Withdraw Stake Account Fee: ${
      state.withdrawStakeAccountFee.bpCents / 10000
    }%`,
    state.withdrawStakeAccountEnabled ? 'enabled' : 'disabled'
  )
  console.log()

  console.log('--- TVL')
  // debug
  logger.debug(
    bnWithLabel(
      'state.validatorSystem.totalActiveBalance',
      state.validatorSystem.totalActiveBalance
    )
  )
  logger.debug(
    bnWithLabel('state.availableReserveBalance', state.availableReserveBalance)
  )
  logger.debug(
    bnWithLabel(
      'sum',
      state.validatorSystem.totalActiveBalance.add(
        state.availableReserveBalance
      )
    )
  )
  logger.debug(
    bnWithLabel('state.emergencyCoolingDown', state.emergencyCoolingDown)
  )
  logger.debug(
    bnWithLabel(
      'state.stakeSystem.delayedUnstakeCoolingDown',
      state.stakeSystem.delayedUnstakeCoolingDown
    )
  )

  console.log(aligned('TVL Staking', tvlStaking), 'SOL')
  console.log(aligned('TVL Liquidity-Pool', tvlLiquidity), 'SOL')
  console.log(aligned('Total TVL', tvlStaking + tvlLiquidity), 'SOL')

  console.log('--- Pause')
  console.log('Is Paused', state.paused)
  console.log('Pause authority', state.pauseAuthority.toBase58())

  if (withList) {
    await listValidatorsWithStake(marinadeState)
  }
}

async function listValidatorsWithStake(marinadeState: MarinadeState) {
  const { state } = marinadeState
  const { validatorRecords, capacity: validatorCapacity } =
    await marinadeState.getValidatorRecords()
  const { stakeInfos, capacity: stakeCapacity } =
    await marinadeState.getStakeInfos()

  console.log()
  console.log(
    '  Validator_manager_authority',
    state.validatorSystem.managerAuthority.toBase58()
  )
  console.log(
    `  Stake list account: ${state.stakeSystem.stakeList.account} with ${state.stakeSystem.stakeList.count}/${stakeCapacity} stakes`
  )
  console.log('-----------------')
  console.log('-- Validators ---')
  console.log(
    `  Total staked: ${MarinadeUtils.lamportsToSol(
      state.validatorSystem.totalActiveBalance
    )} SOL  (Note:4~5% from total TVL is usually re-balancing)`
  )
  console.log(
    `  List account: ${state.validatorSystem.validatorList.account} with ${state.validatorSystem.validatorList.count}/${validatorCapacity} validators`
  )
  console.log('-------------------------------------------------------------')

  const epochInfo = await marinadeState.epochInfo()

  let totalStaked = new BN(0)
  let totalStakedFullyActivated = new BN(0)

  // Filter active validator & stakeInfo
  const activeValidatorRecordWithIndexes = validatorRecords
    .map((value, index) => {
      return { validatorRecord: value, validatorIndex: index }
    })
    .filter(validator => validator.validatorRecord.activeBalance.toNumber() > 0)
  const activeStakeInfos = stakeInfos
    .filter(stakeInfo => stakeInfo.stake.Stake?.stake.delegation)
    .filter(
      stakeInfo =>
        stakeInfo.stake.Stake &&
        MarinadeUtils.U64_MAX.eq(
          stakeInfo.stake.Stake.stake.delegation.deactivationEpoch
        )
    )

  activeValidatorRecordWithIndexes.forEach(validatorWithIndex => {
    // Find stakeInfo by delegation for current validatorWithIndex
    const validatorStakes: MarinadeBorsh.StakeInfo[] = activeStakeInfos.filter(
      stakeInfo =>
        stakeInfo.stake.Stake?.stake.delegation.voterPubkey.equals(
          validatorWithIndex.validatorRecord.validatorAccount
        )
    )
    const validatorScorePercent =
      (validatorWithIndex.validatorRecord.score * 100) /
      state.validatorSystem.totalValidatorScore

    console.log(
      `${
        validatorWithIndex.validatorIndex + 1
      }) Validator ${validatorWithIndex.validatorRecord.validatorAccount.toBase58()}` +
        `, marinade-staked ${MarinadeUtils.lamportsToSol(
          validatorWithIndex.validatorRecord.activeBalance
        ).toFixed(2)} SOL` +
        `, score-pct: ${validatorScorePercent.toFixed(4)}%, ${
          validatorStakes.length
        } stake-accounts`
    )

    for (const [, stakeInfo] of validatorStakes.entries()) {
      const delegation = stakeInfo.stake.Stake?.stake
        .delegation as MarinadeBorsh.Delegation
      const meta = stakeInfo.stake.Stake?.meta as MarinadeBorsh.Meta
      const extraBalance = MarinadeUtils.lamportsToSol(
        stakeInfo.balance.sub(delegation.stake).sub(meta.rentExemptReserve)
      )

      console.log(
        `  ${
          stakeInfo.index
        }. Stake ${stakeInfo.record.stakeAccount.toBase58()} delegated` +
          ` ${MarinadeUtils.lamportsToSol(
            delegation ? delegation.stake : new BN(0)
          )} activation_epoch:${delegation.activationEpoch}` +
          (extraBalance > 0 ? ` (extra balance ${extraBalance})` : '')
      )

      totalStaked = totalStaked.add(delegation.stake)
      if (delegation.activationEpoch.toNumber() < epochInfo.epoch - 1) {
        totalStakedFullyActivated = totalStakedFullyActivated.add(
          delegation.stake
        )
      }
    }
    console.log('-------------------------')
  })

  console.log(
    ` ${activeValidatorRecordWithIndexes.length} validators with stake` +
      `, total_staked ${MarinadeUtils.lamportsToSol(new BN(totalStaked))}` +
      `, total_staked_fully_activated ${MarinadeUtils.lamportsToSol(
        new BN(totalStakedFullyActivated)
      )}` +
      `, warming-up in this epoch:${MarinadeUtils.lamportsToSol(
        totalStaked.sub(totalStakedFullyActivated)
      )}`
  )

  // find cooling down stakes by empty delegation or deactivationEpoch != U64_MAX
  const coolingDownStakes: MarinadeBorsh.StakeInfo[] = stakeInfos.filter(
    stakeInfo =>
      !stakeInfo.stake.Stake ||
      !stakeInfo.stake.Stake.stake.delegation ||
      !MarinadeUtils.U64_MAX.eq(
        stakeInfo.stake.Stake.stake.delegation.deactivationEpoch
      )
  )
  if (coolingDownStakes.length > 0) {
    console.log('-------------------------')
    console.log('-- Cooling down stakes --')

    coolingDownStakes.forEach(stakeInfo => {
      const delegation = stakeInfo.stake.Stake?.stake.delegation
      if (delegation) {
        const meta = stakeInfo.stake.Stake?.meta as MarinadeBorsh.Meta
        const extraBalance = MarinadeUtils.lamportsToSol(
          stakeInfo.balance.sub(delegation.stake).sub(meta.rentExemptReserve)
        )

        console.log(
          `  ${
            stakeInfo.index
          }. Stake ${stakeInfo.record.stakeAccount.toBase58()} delegated` +
            ` ${MarinadeUtils.lamportsToSol(
              delegation ? delegation.stake : new BN(0)
            )} to ${delegation.voterPubkey.toBase58()}` +
            (extraBalance > 0 ? ` (extra balance ${extraBalance})` : '')
        )
      } else {
        console.log(
          `  ${
            stakeInfo.index
          }. Stake ${stakeInfo.record.stakeAccount.toBase58()} (full balance ${
            stakeInfo.balance
          })`
        )
      }
    })
  }
}

function aligned(label: string, n: number): string {
  return label.slice(0, 20).padEnd(20) + ':' + n.toLocaleString().padStart(20)
}

function bnWithLabel(label: string, bn: InstanceType<typeof BN>): string {
  return (
    label.slice(0, 40).padEnd(20) +
    ':' +
    MarinadeUtils.lamportsToSol(bn).toLocaleString().padStart(20)
  )
}
