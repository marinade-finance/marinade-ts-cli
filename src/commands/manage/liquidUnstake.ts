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

export function installLiquidUnstake(program: Command) {
  program
    .command('liquid-unstake')
    .description('Unstake mSOL using liquidity pool')
    .argument('<amount-msol>', 'mSOL amount to unstake', parseFloat)
    .option(
      '-r, --referral <referral-code>',
      'Use the referral code for liquid unstaking',
      parsePubkey
    )
    .action(
      async (
        amountMsol: number,
        { referralCode }: { referralCode: Promise<PublicKey> }
      ) => {
        await liquidUnstake({
          amountMsol,
          referralCode: await referralCode,
        })
      }
    )
}

export async function liquidUnstake({
  amountMsol,
  referralCode,
}: {
  amountMsol: number
  referralCode?: PublicKey
}): Promise<void> {
  const { connection, logger, walletSigner, simulate, printOnly } = useContext()

  const amountLamports = MarinadeUtils.solToLamports(amountMsol)
  logger.info(
    'Liquid unstake: %d mSOL (lamports %s)',
    amountMsol,
    amountLamports.toString()
  )

  const marinadeConfig = new MarinadeConfig({
    connection: connection,
    publicKey: walletSigner.publicKey,
    referralCode: referralCode ?? null,
  })
  const marinade = new Marinade(marinadeConfig)

  const { associatedMSolTokenAccountAddress, transaction } =
    await marinade.liquidUnstake(amountLamports)
  logger.info(
    'Using associated msol account: %s',
    associatedMSolTokenAccountAddress.toBase58()
  )

  await executeTx({
    connection,
    errMessage: `Failed to unstake ${amountMsol} mSOLs for ${walletSigner.publicKey.toBase58()}`,
    signers: [walletSigner],
    transaction,
    logger,
    simulate,
    printOnly,
  })
  logger.info(
    'Succcesfully liquid unstaked %d mSOLs, signed by %s (referral code: %s)',
    amountMsol,
    walletSigner.publicKey.toBase58(),
    referralCode?.toBase58() ?? 'none'
  )
}
