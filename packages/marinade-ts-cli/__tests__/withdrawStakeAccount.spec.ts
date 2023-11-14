import { shellMatchers } from '@marinade.finance/jest-utils'
import {
  CONNECTION,
  waitForStakeAccountActivation,
  PROVIDER,
  STAKE_ACCOUNT_TO_WITHDRAW,
  STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY,
  transfer,
  STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY_PATH,
} from './setup/globalSetup'
import { getAccount } from '@solana/spl-token-3.x'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

beforeAll(async () => {
  shellMatchers()
})

// Withdraw stake account SDK call is not implemented
describe.skip('Withdraw stake account using CLI', () => {
  it('withdraw stake account', async () => {
    // Fill SOLs to authority key that's used by Marinade as fee payer
    await transfer({ to: STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY.publicKey })
    // STAKE_ACCOUNT_TO_WITHDRAW was created in globalSetup.ts
    await waitForStakeAccountActivation({
      stakeAccount: STAKE_ACCOUNT_TO_WITHDRAW.publicKey,
      activatedAtLeastFor: 2,
      provider: PROVIDER,
    })

    // First we will deposit the stake account and then we can test to withdraw it via CLI
    const marinadeConfig = new MarinadeConfig({
      connection: CONNECTION,
      publicKey: STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY.publicKey,
    })
    const marinade = new Marinade(marinadeConfig)
    const { transaction, associatedMSolTokenAccountAddress } =
      await marinade.depositStakeAccount(STAKE_ACCOUNT_TO_WITHDRAW.publicKey)
    await PROVIDER.sendAndConfirm(transaction, [
      STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY,
    ])

    const msolTokenBefore = await getAccount(
      CONNECTION,
      associatedMSolTokenAccountAddress
    )
    const toWithdraw = 321 * LAMPORTS_PER_SOL

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'withdraw-stake-account',
          toWithdraw,
          '--stake-account',
          STAKE_ACCOUNT_TO_WITHDRAW.publicKey.toBase58(),
          '--keypair',
          STAKE_ACCOUNT_TO_WITHDRAW_AUTHORITY_PATH,
          '-d',
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully withdrawn/,
    })

    const msolTokenAfter = await getAccount(
      CONNECTION,
      associatedMSolTokenAccountAddress
    )
    expect(msolTokenAfter.amount).toBe(
      msolTokenBefore.amount - BigInt(toWithdraw)
    )
  })
})
