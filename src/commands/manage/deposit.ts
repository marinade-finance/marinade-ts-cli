import {
  Marinade,
  MarinadeConfig,
  MarinadeUtils,
} from '@marinade.finance/marinade-ts-sdk'
import { parsePubkey } from '../../utils/cliParser'
import { Command } from 'commander'
import { PublicKey } from '@solana/web3.js'
import { useContext } from '../../context'
import { executeTx } from '../../utils/transactions'

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
  owner = useContext().walletSigner.publicKey,
  validatorVoteAddress,
}: {
  amountSol: number
  referralCode?: PublicKey
  owner?: PublicKey
  validatorVoteAddress?: PublicKey
}): Promise<void> {
  const { connection, logger, walletSigner, simulate, printOnly } = useContext()

  const amountLamports = MarinadeUtils.solToLamports(amountSol)
  logger.info(
    'Staking: %d SOL (%s lamports)',
    amountSol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
    referralCode: referralCode ?? null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } =
    await marinade.deposit(amountLamports, {
      directToValidatorVoteAddress: validatorVoteAddress,
      mintToOwnerAddress: owner,
    })
  logger.info(
    'Using associated msol account: %s',
    associatedMSolTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage: `Failed to deposit ${amountSol} SOLs from ${walletSigner.publicKey.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Succcesfully deposited %d SOLs from %s for mSOL mint owner %s (validator vote address: %s, refferal code: %s)',
    amountSol,
    walletSigner.publicKey.toBase58(),
    owner.toBase58(),
    validatorVoteAddress?.toBase58() || 'none',
    referralCode?.toBase58() || 'none'
  )
}
