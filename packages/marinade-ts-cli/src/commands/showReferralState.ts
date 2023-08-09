import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { PublicKey } from '@solana/web3.js'
import { parsePubkey } from '@marinade.finance/cli-common'
import { getMarinadeCliContext } from '../context'

export function installShowReferralState(program: Command) {
  program
    .command('show-referral-state')
    .description("Show Marinade referral partner's state")
    .argument(
      '<referral-code>',
      'Address of referral partner state to show',
      parsePubkey
    )
    .action(async (referralCode: Promise<PublicKey>) => {
      await showReferralState({ referralCode: await referralCode })
    })
}

export async function showReferralState({
  referralCode,
}: {
  referralCode: PublicKey
}) {
  const { connection, logger } = getMarinadeCliContext()
  logger.debug('Referral account:', referralCode.toBase58())

  const marinadeConfig = new MarinadeConfig({
    connection,
    referralCode,
  })
  const marinade = new Marinade(marinadeConfig)
  const { state: referralState } = await marinade.getReferralPartnerState()

  console.log('---')
  console.log('Partner:', referralState.partnerName)
  console.log('Partner Main Account:', referralState.partnerAccount.toBase58())
  console.log(
    'Partner mSOL Token Account:',
    referralState.msolTokenPartnerAccount.toBase58()
  )
  if (referralState.validatorVoteKey) {
    console.log()
    console.log('-- STAKE-AS-COLLATERAL Partner--')
    console.log('validatorVoteKey:', referralState.validatorVoteKey.toBase58())
    console.log('keep self stake:', referralState.keepSelfStakePct, '%')
  }
  if (referralState.pause) console.log('--PAUSED--')

  console.log()
  console.log('Deposit SOL')
  console.log(
    ' -- SOL amount:',
    MarinadeUtils.lamportsToSol(referralState.depositSolAmount)
  )
  console.log(' -- operations:', referralState.depositSolOperations.toNumber())
  console.log()
  console.log('Deposit Stake Account')
  console.log(
    ' -- SOL amount:',
    MarinadeUtils.lamportsToSol(referralState.depositStakeAccountAmount)
  )
  console.log(
    ' -- operations:',
    referralState.depositStakeAccountOperations.toNumber()
  )
  console.log()
  console.log('Liquid Unstake')
  console.log(
    ' -- SOL amount:',
    MarinadeUtils.lamportsToSol(referralState.liqUnstakeSolAmount)
  )
  console.log(
    ' --mSOL amount:',
    MarinadeUtils.lamportsToSol(referralState.liqUnstakeMsolAmount)
  )
  console.log(
    ' --mSOL fees  :',
    MarinadeUtils.lamportsToSol(referralState.liqUnstakeMsolFees)
  )
  console.log(' -- operations:', referralState.liqUnstakeOperations.toNumber())

  // TODO: verify that this is not needed
  // commented because Delayed Unstake is not enabled yet
  // console.log('Delayed Unstake');
  // console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.delayedUnstakeAmount))
  // console.log(' -- operations:', state.delayedUnstakeOperations.toNumber())
}
