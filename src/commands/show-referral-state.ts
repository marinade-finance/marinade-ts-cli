import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk'
import { getProvider } from '@project-serum/anchor'
import { formatDuration } from '../utils/time'

export async function showReferralStateAction (referral: string, options:Record<string,any>): Promise<void> {
  const provider = getProvider()

  console.log('Referral account:', referral)
  const referralCode = new web3.PublicKey(referral)

  const marinadeConfig = new MarinadeConfig({ connection: provider.connection, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { state: referralState } = await marinade.getReferralPartnerState()

  console.log('---')
  console.log('Partner:', referralState.partnerName)
  console.log('Partner Main Account:', referralState.partnerAccount.toBase58())
  console.log('Partner mSOL Token Account:', referralState.tokenPartnerAccount.toBase58())
  if (referralState.pause) console.log('--PAUSED--');

  const lastTransferTimeTimestamp = referralState.lastTransferTime.toNumber()
  const lastTransferTime = new Date(lastTransferTimeTimestamp * 1e3)
  // commented because auto-transfers are not enabled yet
  // console.log('---')
  // console.log('Transfer duration:', formatDuration(state.transferDuration), `(${state.transferDuration})`)
  // console.log('Last Transfer Time:', lastTransferTime, `(${lastTransferTimeTimestamp})`)
  // console.log('Max Net Stake:', MarinadeUtils.lamportsToSol(state.maxNetStake))
  // console.log('Base fee:', state.baseFee, 'Max fee:', state.maxFee)
  // console.log('---')

  console.log()
  console.log('Deposit SOL');
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(referralState.depositSolAmount));
  console.log(' -- operations:', referralState.depositSolOperations.toNumber())
  console.log()
  console.log('Deposit Stake Account');
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(referralState.depositStakeAccountAmount));
  console.log(' -- operations:', referralState.depositStakeAccountOperations.toNumber())
  console.log()
  console.log('Liquid Unstake');
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(referralState.liqUnstakeSolAmount));
  console.log(' --mSOL amount:', MarinadeUtils.lamportsToSol(referralState.liqUnstakeMsolAmount))
  console.log(' --mSOL fees  :', MarinadeUtils.lamportsToSol(referralState.liqUnstakeMsolFees))
  console.log(' -- operations:', referralState.liqUnstakeOperations.toNumber())
  // commented because Delayed Unstake is not enabled yet
  // console.log('Delayed Unstake');
  // console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.delayedUnstakeAmount))
  // console.log(' -- operations:', state.delayedUnstakeOperations.toNumber())


}
