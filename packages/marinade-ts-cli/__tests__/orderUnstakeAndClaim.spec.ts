import { BN } from 'bn.js'
import { shellMatchers } from '@marinade.finance/jest-utils'
import { createTempFileKeypair } from '@marinade.finance/web3js-common'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { CONNECTION, transfer, PROVIDER, sleep } from './setup/globalSetup'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { TicketAccount } from '@marinade.finance/marinade-ts-sdk/dist/src/marinade-state/borsh/ticket-account'

beforeAll(async () => {
  shellMatchers()
})

describe('Order unstake and claim using CLI', () => {
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

  it('order unstake and claim', async () => {
    console.log(
      'WARN: this test takes about 1 minute to run. Claiming tickets requires waiting for the ticket to be ready.'
    )

    const marinadeConfig = new MarinadeConfig({
      connection: CONNECTION,
      publicKey: walletKeypair.publicKey,
    })
    const marinade = new Marinade(marinadeConfig)
    const { transaction } = await marinade.deposit(
      new BN(555 * LAMPORTS_PER_SOL)
    )
    await PROVIDER.sendAndConfirm(transaction, [walletKeypair])

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'order-unstake',
          '444',
          '--keypair',
          walletPath,
          '--confirmation-finality',
          'confirmed',
          '-d',
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      stdout: /Successfully ordered unstake/,
    })

    // Waiting for the ticket to be ready; max time is now hardcoded
    const timeoutSeconds = 60
    const tickets = await marinade.getDelayedUnstakeTickets(
      walletKeypair.publicKey
    )
    expect(tickets.size).toBe(1)
    const startTime = Date.now()
    let ticket: [PublicKey, TicketAccount] | undefined = tickets
      .entries()
      .next().value

    while (
      ticket &&
      (!ticket[1].ticketDueDate || isNaN(ticket[1].ticketDueDate.getTime()))
    ) {
      console.log(
        'Waiting for ticket',
        ticket[0].toBase58(),
        'elapsed time:',
        (Date.now() - startTime) / 1000,
        'seconds'
      )
      await sleep(5000)
      ticket = (
        await marinade.getDelayedUnstakeTickets(walletKeypair.publicKey)
      )
        .entries()
        .next().value
      if (ticket && Date.now() - startTime > timeoutSeconds * 1000) {
        throw new Error(
          `Ticket ${ticket[0]} was not available for claiming in timeout of ${timeoutSeconds} seconds`
        )
      }
    }

    if (!ticket) {
      throw new Error('Ticket is undefined')
    }

    await (
      expect([
        'pnpm',
        [
          'cli',
          '--url',
          CONNECTION.rpcEndpoint,
          'claim',
          ticket[0].toBase58(),
          '--keypair',
          walletPath,
          '--confirmation-finality',
          'confirmed',
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ]) as any
    ).toHaveMatchingSpawnOutput({
      code: 0,
      stdout: /Successfully claimed ticket/,
    })
  })
})
