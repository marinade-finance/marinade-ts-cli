import { shellMatchers } from '@marinade.finance/jest-utils'
import { createTempFileKeypair } from '@marinade.finance/web3js-common'
import { Keypair } from '@solana/web3.js'
import { CONNECTION, transfer } from './setup/globalSetup'

beforeAll(async () => {
  shellMatchers()
})

describe('Add liquidity using CLI', () => {
  let walletPath: string
  let walletKeypair: Keypair
  let cleanupWallet: () => Promise<void>

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
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
    await (
      expect([
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully added liquidity/,
    })
  })
})
