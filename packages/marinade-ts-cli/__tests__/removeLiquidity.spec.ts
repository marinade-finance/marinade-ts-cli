import { BN } from 'bn.js'
import { shellMatchers } from '@marinade.finance/jest-utils'
import { createTempFileKeypair } from '@marinade.finance/web3js-common'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { CONNECTION, PROVIDER, transfer } from './setup/globalSetup'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'

beforeAll(async () => {
  shellMatchers()
})

describe('Remove liquidity using CLI', () => {
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

  it('remove liquidity', async () => {
    const marinadeConfig = new MarinadeConfig({
      connection: CONNECTION,
      publicKey: walletKeypair.publicKey,
    })
    const marinade = new Marinade(marinadeConfig)
    const { transaction } = await marinade.addLiquidity(
      new BN(500 * LAMPORTS_PER_SOL)
    )
    PROVIDER.sendAndConfirm(transaction, [walletKeypair])

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'remove-liquidity',
          '123',
          '--keypair',
          walletPath,
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      // stderr: '', omitting this check because of the github actions error:
      //             bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)
      stdout: /Successfully removed liquidity/,
    })
  })
})
