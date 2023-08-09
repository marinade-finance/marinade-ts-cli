import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import {
  lamportsToSol,
  getAssociatedTokenAccountAddress,
} from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import { Command } from 'commander'
import { BN } from 'bn.js'
import { parsePubkey } from '@marinade.finance/cli-common'
import { PublicKey } from '@solana/web3.js'
import { getMarinadeCliContext } from '../context'

export function installShowBalance(program: Command) {
  program
  program
    .command('balance')
    .description('Show account balance')
    .argument(
      '[account-pubkey]',
      'Account to show balance for (default: wallet pubkey)',
      parsePubkey
    )
    .action(async (accountPubkey: Promise<PublicKey>) => {
      await showBalance({
        accountPubkey: await accountPubkey,
      })
    })
}

export async function showBalance({
  accountPubkey = getMarinadeCliContext().wallet.publicKey,
}: {
  accountPubkey?: PublicKey
  marinadeStateAddress?: PublicKey
}) {
  const { connection, logger } = getMarinadeCliContext()

  logger.info(
    'Main account: %s (%s)',
    accountPubkey.toBase58(),
    'Note: transactions can take up to a minute to be reflected here'
  )

  const config = new MarinadeConfig({ connection })
  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState()

  const { lpMint, mSolMintAddress } = marinadeState

  const balanceLamports = new BN(await connection.getBalance(accountPubkey))
  console.log(`SOL Balance: ${lamportsToSol(balanceLamports)}`)

  const userMSolATA = await getAssociatedTokenAccountAddress(
    mSolMintAddress,
    accountPubkey
  )
  try {
    const {
      value: { amount: amountMSOL },
    } = await connection.getTokenAccountBalance(userMSolATA)
    const mSolATABalance = new BN(amountMSOL)
    console.log(`mSOL Balance: ${lamportsToSol(mSolATABalance)}`)
  } catch (e) {
    logger.error(
      `MSOL ATA of the account ${accountPubkey.toBase58()} does not exist`,
      e
    )
  }

  try {
    const userLpATA = await getAssociatedTokenAccountAddress(
      lpMint.address,
      accountPubkey
    )
    const {
      value: { amount: amountLP },
    } = await connection.getTokenAccountBalance(userLpATA)
    const userLpATABalance = new BN(amountLP)
    console.log(`mSOL-SOL-LP Balance: ${lamportsToSol(userLpATABalance)}`)
  } catch (e) {
    logger.error(
      `LP ATA of the account ${accountPubkey.toBase58()} does not exist`,
      e
    )
  }
}
