import { extendJestWithShellMatchers } from '@marinade.finance/jest-shell-matcher'
import { createTempFileKeypair } from '@marinade.finance/web3js-1x'

import { CONNECTION, transfer } from './setup/globalSetup'

import type { Keypair } from '@solana/web3.js'

beforeAll(() => {
  extendJestWithShellMatchers()
})

describe('Add liquidity using CLI', () => {
  let walletPath: string
  let walletKeypair: Keypair
  let cleanupWallet: () => Promise<void>

  beforeEach(async () => {
    ;({
      path: walletPath,
      keypair: walletKeypair,
      cleanup: cleanupWallet,
    } = await createTempFileKeypair())
    await transfer({ to: walletKeypair.publicKey, amountSol: 1000 })
  })

  afterEach(async () => {
    await cleanupWallet()
  })

  it('add liquidity', async () => {
    await expect([
      'pnpm',
      [
        'cli',
        '--url',
        CONNECTION.rpcEndpoint,
        'add-liquidity',
        '888',
        '--keypair',
        walletPath,
        '--confirmation-finality',
        'confirmed',
      ],
    ]).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully added liquidity/,
    })
  })
})
