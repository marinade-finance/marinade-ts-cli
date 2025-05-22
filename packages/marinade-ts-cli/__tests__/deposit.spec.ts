import { shellMatchers } from '@marinade.finance/jest-utils'
import { createTempFileKeypair } from '@marinade.finance/web3js-common'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { CONNECTION, transfer } from './setup/globalSetup'

beforeAll(async () => {
  shellMatchers()
})

describe('Deposit using CLI', () => {
  let walletPath: string
  let walletKeypair: Keypair
  let cleanupWallet: () => Promise<void>

  let ownerKeypair: Keypair
  let cleanupOwner: () => Promise<void>

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({
      path: walletPath,
      keypair: walletKeypair,
      cleanup: cleanupWallet,
    } = await createTempFileKeypair())
    await transfer({ to: walletKeypair.publicKey, amountSol: 1000 })

    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;({ keypair: ownerKeypair, cleanup: cleanupOwner } =
      await createTempFileKeypair())
  })

  afterEach(async () => {
    await cleanupOwner()
    await cleanupWallet()
  })

  it('deposit', async () => {
    await transfer({ to: ownerKeypair.publicKey, amountSol: 33 })
    await expect(
      CONNECTION.getBalance(ownerKeypair.publicKey),
    ).resolves.toStrictEqual(33 * LAMPORTS_PER_SOL)

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'deposit',
          '33',
          '--keypair',
          walletPath,
          '--owner',
          ownerKeypair.publicKey.toBase58(),
          '--confirmation-finality',
          'confirmed',
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error (https://github.com/trufflesuite/ganache/issues/1080)
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully deposited/,
    })
  })
})
