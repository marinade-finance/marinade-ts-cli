import { shellMatchers } from '@marinade.finance/solana-test-utils'
import {
  CONNECTION,
  getSolanaTestValidatorVoteAccountPubkey,
  STAKE_ACCOUNT,
  waitForStakeAccountActivation,
  SDK_USER_PATH,
  PROVIDER,
} from './setup/globalSetup'

beforeAll(async () => {
  shellMatchers()
})

describe('Deposit stake account using CLI', () => {
  it('deposit stake account', async () => {
    const solanaTestValidatorVotePubkey =
      await getSolanaTestValidatorVoteAccountPubkey()

    // STAKE_ACCOUNT was created in globalSetup.ts
    await waitForStakeAccountActivation({
      stakeAccount: STAKE_ACCOUNT.publicKey,
      activatedAtLeastFor: 2,
      provider: PROVIDER,
    })

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'deposit-stake-account',
          STAKE_ACCOUNT.publicKey.toBase58(),
          '--keypair',
          SDK_USER_PATH,
          '--validator',
          solanaTestValidatorVotePubkey.toBase58(),
          '-d',
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', ommitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Succcesfully deposited stake account/,
    })
  })
})
