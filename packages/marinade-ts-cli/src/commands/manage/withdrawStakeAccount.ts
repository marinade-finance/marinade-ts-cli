import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { Command } from 'commander'
import { parsePubkey } from '@marinade.finance/cli-common'
import { PublicKey } from '@solana/web3.js'
import { executeTx } from '@marinade.finance/web3js-common'
import { getMarinadeCliContext } from '../../context'

export function installWithdrawStakeAccount(program: Command) {
  program
    .command('withdraw-stake-account')
    .description('withdraw stake account')
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
  const { connection, wallet, logger, simulate, printOnly } =
    getMarinadeCliContext()

  logger.info(
    'Withdrawing %d MSOLs from stake account: %s with wallet key %s',
    amountMsol,
    stakeAccount.toBase58(),
    wallet.publicKey.toBase58()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
  })
  const marinade = new Marinade(marinadeConfig)

  const {
    transaction,
    splitStakeAccountKeypair,
    associatedMSolTokenAccountAddress,
  } = await marinade.withdrawStakeAccount(amountMsol, stakeAccount)

  await executeTx({
    connection,
    errMessage: `Failed to withdraw stake account ${stakeAccount.toBase58()}`,
    signers: [wallet, splitStakeAccountKeypair],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Successfully withdrawn %d MSOLs from stake account %s. The MSOLs converted from MSOL ATA %s to SOL into wallet key account %s',
    amountMsol,
    stakeAccount.toBase58(),
    associatedMSolTokenAccountAddress.toBase58(),
    wallet.publicKey.toBase58()
  )
}
