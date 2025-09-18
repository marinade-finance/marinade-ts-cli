import { extendJestWithShellMatchers } from '@marinade.finance/jest-shell-matcher'

import {
  CONNECTION,
  STAKE_ACCOUNT,
  waitForStakeAccountActivation,
  SDK_USER_PATH,
  PROVIDER,
} from './setup/globalSetup'

beforeAll(() => {
  extendJestWithShellMatchers()
})

describe('Deposit stake account using CLI', () => {
  it('deposit stake account', async () => {
    // STAKE_ACCOUNT was created in globalSetup.ts
    await waitForStakeAccountActivation({
      stakeAccount: STAKE_ACCOUNT.publicKey,
      activatedAtLeastFor: 2,
      provider: PROVIDER,
    })

    await expect([
      'pnpm',
      [
        'cli',
        '--url',
        CONNECTION.rpcEndpoint,
        'deposit-stake-account',
        STAKE_ACCOUNT.publicKey.toBase58(),
        '--keypair',
        SDK_USER_PATH,
        '--confirmation-finality',
        'confirmed',
        '-d',
      ],
    ]).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully deposited stake account/,
    })
  })
})
