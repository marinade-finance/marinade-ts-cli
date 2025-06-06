import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { parsePubkey } from '@marinade.finance/cli-common'
import { Command } from 'commander'
import { PublicKey } from '@solana/web3.js'
import { executeTx } from '@marinade.finance/web3js-common'
import { getMarinadeCliContext } from '../../context'

export function installDeposit(program: Command) {
  program
    .command('deposit')
    .description('Deposit SOL')
    .argument('<amount-sol>', 'SOL amount to deposit', parseFloat)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for depositing',
      parsePubkey,
    )
    .option(
      '-o, --owner <referral-code>',
      'The address of the owner account where mSOL will be minted to for the deposited amount (default: wallet pubkey)',
      parsePubkey,
    )
    .action(
      async (
        amountSol: number,
        {
          referralCode,
          owner,
        }: {
          referralCode: Promise<PublicKey>
          owner: Promise<PublicKey>
          validatorVoteAddress: Promise<PublicKey>
        },
      ) => {
        await deposit({
          amountSol,
          referralCode: await referralCode,
          owner: await owner,
        })
      },
    )
}

export async function deposit({
  amountSol,
  referralCode,
  owner = getMarinadeCliContext().wallet.publicKey,
}: {
  amountSol: number
  referralCode?: PublicKey
  owner?: PublicKey
}): Promise<void> {
  const {
    connection,
    logger,
    wallet,
    simulate,
    printOnly,
    confirmationFinality,
  } = getMarinadeCliContext()

  const amountLamports = MarinadeUtils.solToLamports(amountSol)
  logger.info(
    'Staking: %d SOL (%s lamports)',
    amountSol,
    amountLamports.toString(),
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
    referralCode: referralCode ?? null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } =
    await marinade.deposit(amountLamports, {
      mintToOwnerAddress: owner,
    })
  logger.info(
    'Using associated mSOL account: %s',
    associatedMSolTokenAccountAddress.toBase58(),
  )

  await executeTx({
    connection,
    errMessage: `Failed to deposit ${amountSol} SOLs from ${wallet.publicKey.toBase58()}`,
    signers: [wallet],
    transaction,
    logger,
    simulate,
    printOnly,
    confirmOpts: confirmationFinality,
  })
  logger.info(
    'Successfully deposited %d SOLs from %s for mSOL mint owner %s (validator vote address: %s, referral code: %s)',
    amountSol,
    wallet.publicKey.toBase58(),
    owner.toBase58(),
    referralCode?.toBase58() || 'none',
  )
}
