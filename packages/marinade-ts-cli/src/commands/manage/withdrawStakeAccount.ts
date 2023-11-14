import { Command } from 'commander'
import { parsePubkey } from '@marinade.finance/cli-common'
import { PublicKey } from '@solana/web3.js'
import { getMarinadeCliContext } from '../../context'

export function installWithdrawStakeAccount(program: Command) {
  program
    .command('withdraw-stake-account')
    .description('Withdraw stake account')
    .argument('<amount-msol>', 'MSOL amount to withdraw', parseFloat)
    .requiredOption(
      '-s, --stake-account <stake-account-address>',
      'Stake account to withdraw',
      parsePubkey
    )
    .action(
      async (
        amountMsol: number,
        {
          stakeAccount,
        }: {
          stakeAccount: Promise<PublicKey>
        }
      ) => {
        await withdrawStakeAccount({
          amountMsol,
          stakeAccount: await stakeAccount,
        })
      }
    )
}

export async function withdrawStakeAccount({
  amountMsol,
  stakeAccount,
}: {
  amountMsol: number
  stakeAccount: PublicKey
}): Promise<void> {
  // const { connection, wallet, logger, simulate, printOnly } =
  //   getMarinadeCliContext()

  const { wallet, logger } = getMarinadeCliContext()
  logger.info(
    'Withdrawing %d MSOLs from stake account: %s with wallet key %s',
    amountMsol,
    stakeAccount.toBase58(),
    wallet.publicKey.toBase58()
  )

  logger.debug(
    'A workaround could be (not sure if working in future) ' +
      'to use version 5.0.6-beta of @marinade.finance/marinade-ts-sdk'
  )
  logger.debug(
    'The SDK call was removed as it was decided not to be part of SDK' +
      'and to be used only within contract interaction'
  )
  throw new Error('Not implemented in marinade-ts-sdk')

  // const marinadeConfig = new MarinadeConfig({
  //   connection: connection,
  //   publicKey: wallet.publicKey,
  // })
  // const marinade = new Marinade(marinadeConfig)

  // const {
  //   transaction,
  //   splitStakeAccountKeypair,
  //   associatedMSolTokenAccountAddress,
  // } = await marinade.withdrawStakeAccount(amountMsol, stakeAccount)

  // await executeTx({
  //   connection,
  //   errMessage: `Failed to withdraw stake account ${stakeAccount.toBase58()}`,
  //   signers: [wallet, splitStakeAccountKeypair],
  //   transaction,
  //   logger,
  //   simulate,
  //   printOnly,
  // })
  // logger.info(
  //   'Successfully withdrawn %d MSOLs from stake account %s. The MSOLs converted from MSOL ATA %s to SOL into wallet key account %s',
  //   amountMsol,
  //   stakeAccount.toBase58(),
  //   associatedMSolTokenAccountAddress.toBase58(),
  //   wallet.publicKey.toBase58()
  // )
}
