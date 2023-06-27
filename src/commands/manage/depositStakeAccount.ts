import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { parsePubkey } from '../../utils/cliParser'
import { useContext } from '../../context'
import { PublicKey } from '@solana/web3.js'
import { executeTx } from '../../utils/transactions'

export function installDepositStakeAccount(program: Command) {
  program
    .command('deposit-stake-account')
    .description('deposit stake account')
    .argument('<stake-account>', 'Stake account to deposit', parsePubkey)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for depositing stake account',
      parsePubkey
    )
    .option(
      '-v, --validator <validator-vote-address>',
      'The vote address of the validator to direct your stake to (default: none)',
      parsePubkey
    )
    .action(
      async (
        stakeAccount: Promise<PublicKey>,
        {
          referralCode,
          validatorVoteAddress,
        }: {
          referralCode: Promise<PublicKey>
          validatorVoteAddress: Promise<PublicKey>
        }
      ) => {
        await depositStakeAccount({
          stakeAccount: await stakeAccount,
          referralCode: await referralCode,
          validatorVoteAddress: await validatorVoteAddress,
        })
      }
    )
}

export async function depositStakeAccount({
  stakeAccount,
  referralCode,
  validatorVoteAddress,
}: {
  stakeAccount: PublicKey
  referralCode?: PublicKey
  validatorVoteAddress?: PublicKey
}): Promise<void> {
  const { connection, walletSigner, logger, simulate, printOnly } = useContext()

  logger.info(
    'Depositing stake account: %s from wallet key %s',
    stakeAccount.toBase58(),
    walletSigner.publicKey.toBase58()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
    referralCode: referralCode || null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { transaction } = await marinade.depositStakeAccount(stakeAccount, {
    directToValidatorVoteAddress: validatorVoteAddress,
  })

  await executeTx({
    connection,
    errMessage: `Failed to deposit stake account ${stakeAccount.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Successfully deposited stake account %s from wallet key %s (validator vote address: %s, referral code: %s)',
    stakeAccount.toBase58(),
    walletSigner.publicKey.toBase58(),
    validatorVoteAddress?.toBase58() || 'none',
    referralCode?.toBase58() || 'none'
  )
}
