import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { executeTx, parsePubkey } from '@marinade.finance/web3js-1x'

import { getMarinadeCliContext } from '../../context'

import type { PublicKey } from '@solana/web3.js'
import type { Command } from 'commander'

export function installLiquidUnstake(program: Command) {
  program
    .command('liquid-unstake')
    .description('Unstake mSOL using liquidity pool')
    .argument('<amount-msol>', 'mSOL amount to unstake', parseFloat)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for liquid unstaking',
      parsePubkey,
    )
    .action(
      async (
        amountMsol: number,
        { referralCode }: { referralCode: Promise<PublicKey> },
      ) => {
        await liquidUnstake({
          amountMsol,
          referralCode: await referralCode,
        })
      },
    )
}

export async function liquidUnstake({
  amountMsol,
  referralCode,
}: {
  amountMsol: number
  referralCode?: PublicKey
}): Promise<void> {
  const {
    connection,
    logger,
    wallet,
    simulate,
    printOnly,
    confirmationFinality,
  } = getMarinadeCliContext()

  const amountLamports = MarinadeUtils.solToLamports(amountMsol)
  logger.info(
    'Liquid unstake: %d mSOL (lamports %s)',
    amountMsol,
    amountLamports.toString(),
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
    referralCode: referralCode ?? null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } =
    await marinade.liquidUnstake(amountLamports)
  logger.info(
    'Using associated mSOL account: %s',
    associatedMSolTokenAccountAddress.toBase58(),
  )

  await executeTx({
    connection,
    errMessage: `Failed to unstake ${amountMsol} mSOLs for ${wallet.publicKey.toBase58()}`,
    signers: [wallet],
    transaction,
    logger,
    simulate,
    printOnly,
    confirmOpts: confirmationFinality,
  })
  logger.info(
    'Successfully liquid unstaked %d mSOLs, signed by %s (referral code: %s)',
    amountMsol,
    wallet.publicKey.toBase58(),
    referralCode?.toBase58() ?? 'none',
  )
}
