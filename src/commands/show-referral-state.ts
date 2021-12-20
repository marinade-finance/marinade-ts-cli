import { Marinade, MarinadeConfig, MarinadeUtils, web3 } from '@marinade.finance/marinade-ts-sdk'
import { getNodeJsProvider, getProviderUrl } from '../utils/anchor'
import { formatDuration } from '../utils/time'

export async function showReferralStateAction (referral: string): Promise<void> {
  const referralCode = new web3.PublicKey(referral)
  const provider = getNodeJsProvider()

  console.log('Provider url:', getProviderUrl())
  console.log('Referral account:', referral)

  const marinadeConfig = new MarinadeConfig({ connection: provider.connection, referralCode })
  const marinade = new Marinade(marinadeConfig)

  const { state } = await marinade.getReferralPartnerState()

  console.log('---')
  console.log('Partner Account:', state.partnerAccount.toBase58())
  console.log('Token Partner Account:', state.tokenPartnerAccount.toBase58())
  if (state.pause) console.log('--PAUSED--');

  const lastTransferTimeTimestamp = state.lastTransferTime.toNumber()
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
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.depositSolAmount));
  console.log(' -- operations:', state.depositSolOperations.toNumber())
  console.log()
  console.log('Deposit Stake Account');
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.depositStakeAccountAmount));
  console.log(' -- operations:', state.depositStakeAccountOperations.toNumber())
  console.log()
  console.log('Liquid Unstake');
  console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.liqUnstakeSolAmount));
  console.log(' --mSOL amount:', MarinadeUtils.lamportsToSol(state.liqUnstakeMsolAmount))
  console.log(' --mSOL fees  :', MarinadeUtils.lamportsToSol(state.liqUnstakeMsolFees))
  console.log(' -- operations:', state.liqUnstakeOperations.toNumber())
  // commented because Delayed Unstake is not enabled yet
  // console.log('Delayed Unstake');
  // console.log(' -- SOL amount:', MarinadeUtils.lamportsToSol(state.delayedUnstakeAmount))
  // console.log(' -- operations:', state.delayedUnstakeOperations.toNumber())


}
