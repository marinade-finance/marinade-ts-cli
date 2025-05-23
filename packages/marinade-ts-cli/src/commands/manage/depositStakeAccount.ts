import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { parsePubkey } from '@marinade.finance/cli-common'
import { PublicKey } from '@solana/web3.js'
import { executeTx } from '@marinade.finance/web3js-common'
import { getMarinadeCliContext } from '../../context'

export function installDepositStakeAccount(program: Command) {
  program
    .command('deposit-stake-account')
    .description('Deposit stake account')
    .argument('<stake-account>', 'Stake account to deposit', parsePubkey)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for depositing stake account',
      parsePubkey,
    )
    .action(
      async (
        stakeAccount: Promise<PublicKey>,
        {
          referralCode,
        }: {
          referralCode: Promise<PublicKey>
        },
      ) => {
        await depositStakeAccount({
          stakeAccount: await stakeAccount,
          referralCode: await referralCode,
        })
      },
    )
}

export async function depositStakeAccount({
  stakeAccount,
  referralCode,
}: {
  stakeAccount: PublicKey
  referralCode?: PublicKey
}): Promise<void> {
  const {
    connection,
    wallet,
    logger,
    simulate,
    printOnly,
    confirmationFinality,
  } = getMarinadeCliContext()

  logger.info(
    'Depositing stake account: %s from wallet key %s',
    stakeAccount.toBase58(),
    wallet.publicKey.toBase58(),
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
    referralCode: referralCode || null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.depositStakeAccount(stakeAccount)

  await executeTx({
    connection,
    errMessage: `Failed to deposit stake account ${stakeAccount.toBase58()}`,
    signers: [wallet],
    transaction,
    logger,
    simulate,
    printOnly,
    confirmOpts: confirmationFinality,
  })
  logger.info(
    'Successfully deposited stake account %s from wallet key %s (validator vote address: %s, referral code: %s)',
    stakeAccount.toBase58(),
    wallet.publicKey.toBase58(),
    referralCode?.toBase58() || 'none',
  )
}
