import BN from 'bn.js'
import { shellMatchers } from '@marinade.finance/jest-utils'
import { createTempFileKeypair } from '@marinade.finance/web3js-common'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { CONNECTION, transfer, PROVIDER } from './setup/globalSetup'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'

beforeAll(async () => {
  shellMatchers()
})

describe('Liquid unstake using CLI', () => {
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
    await transfer({ to: walletKeypair.publicKey, amountSol: 1001 })
  })

  afterEach(async () => {
    await cleanupWallet()
  })

  it('liquid unstake', async () => {
    const marinadeConfig = new MarinadeConfig({
      connection: CONNECTION,
      publicKey: walletKeypair.publicKey,
    })
    const marinade = new Marinade(marinadeConfig)
    const { transaction } = await marinade.deposit(
      new BN(500 * LAMPORTS_PER_SOL),
    )
    const { transaction: transaction2 } = await marinade.addLiquidity(
      new BN(500 * LAMPORTS_PER_SOL),
    )
    await PROVIDER.sendAndConfirm(transaction.add(transaction2), [
      walletKeypair,
    ])

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'liquid-unstake',
          '488',
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
      stdout: /Successfully liquid unstaked/,
    })
  })
})
