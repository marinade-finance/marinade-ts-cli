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
    .description('deposit SOL')
    .argument('<amount-sol>', 'SOL amount to deposit', parseFloat)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for depositing',
      parsePubkey
    )
    .option(
      '-o, --owner <referral-code>',
      'The address of the owner account where mSOL will be minted to for the deposited amount (default: wallet pubkey)',
      parsePubkey
    )
    .option(
      '-v, --validator <validator-vote-address>',
      'The vote address of the validator to direct your stake to (default: none)',
      parsePubkey
    )
    .action(
      async (
        amountSol: number,
        {
          referralCode,
          owner,
          validatorVoteAddress,
        }: {
          referralCode: Promise<PublicKey>
          owner: Promise<PublicKey>
          validatorVoteAddress: Promise<PublicKey>
        }
      ) => {
        await deposit({
          amountSol,
          referralCode: await referralCode,
          owner: await owner,
          validatorVoteAddress: await validatorVoteAddress,
        })
      }
    )
}

export async function deposit({
  amountSol,
  referralCode,
  owner = getMarinadeCliContext().wallet.publicKey,
  validatorVoteAddress,
}: {
  amountSol: number
  referralCode?: PublicKey
  owner?: PublicKey
  validatorVoteAddress?: PublicKey
}): Promise<void> {
  const { connection, logger, wallet, simulate, printOnly } =
    getMarinadeCliContext()

  const amountLamports = MarinadeUtils.solToLamports(amountSol)
  logger.info(
    'Staking: %d SOL (%s lamports)',
    amountSol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: wallet.publicKey,
    referralCode: referralCode ?? null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } =
    await marinade.deposit(amountLamports, {
      directToValidatorVoteAddress: validatorVoteAddress,
      mintToOwnerAddress: owner,
    })
  logger.info(
    'Using associated mSOL account: %s',
    associatedMSolTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage: `Failed to deposit ${amountSol} SOLs from ${wallet.publicKey.toBase58()}`,
    signers: [wallet],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Successfully deposited %d SOLs from %s for mSOL mint owner %s (validator vote address: %s, referral code: %s)',
    amountSol,
    wallet.publicKey.toBase58(),
    owner.toBase58(),
    validatorVoteAddress?.toBase58() || 'none',
    referralCode?.toBase58() || 'none'
  )
}
