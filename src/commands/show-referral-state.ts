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
  console.log('Paused:', state.pause)

  console.log('---')
  const lastTransferTimeTimestamp = state.lastTransferTime.toNumber()
  const lastTransferTime = new Date(lastTransferTimeTimestamp * 1e3)
  console.log('Transfer duration:', formatDuration(state.transferDuration), `(${state.transferDuration})`)
  console.log('Last Transfer Time:', lastTransferTime, `(${lastTransferTimeTimestamp})`)

  console.log('---')
  console.log('Deposit SOL amount:', MarinadeUtils.lamportsToSol(state.depositSolAmount), 'operations:', state.depositSolOperations.toNumber())
  console.log('Deposit Stake Account amount:', MarinadeUtils.lamportsToSol(state.depositStakeAccountAmount), 'operations:', state.depositStakeAccountOperations.toNumber())
  console.log('Liquid Unstake SOL amount:', MarinadeUtils.lamportsToSol(state.liqUnstakeSolAmount), 'mSOL amount:', MarinadeUtils.lamportsToSol(state.liqUnstakeMsolAmount), 'operations:', state.liqUnstakeOperations.toNumber())
  console.log('Delayed Unstake amount:', MarinadeUtils.lamportsToSol(state.delayedUnstakeAmount), 'operations:', state.delayedUnstakeOperations.toNumber())

  console.log('---')
  console.log('Liquid Unstake mSOL fees:', MarinadeUtils.lamportsToSol(state.liqUnstakeMsolFees))
  console.log('Max Net Stake:', MarinadeUtils.lamportsToSol(state.maxNetStake))

  console.log('---')
  console.log('Base fee:', state.baseFee, 'Max fee:', state.maxFee)
}
