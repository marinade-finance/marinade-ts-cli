import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { readFile } from 'fs/promises'
import fs from 'fs'
import { sleep } from '@marinade.finance/ts-common'
import { getStakeAccount } from '@marinade.finance/web3js-common/src/stakeAccount'

export async function getAnchorValidatorInfo(
  connection: Connection,
  identityKeypairPath?: string
): Promise<{
  votePubkey: PublicKey
  validatorIdentity: Keypair
  validatorIdentityPath: string
}> {
  // loading the test validator identity key pair, we expect the Anchor paths are defaults
  // and that the tests is run with `pnpm test` from the root directory
  identityKeypairPath =
    identityKeypairPath ??
    process.cwd() + '/.anchor/test-ledger/validator-keypair.json'
  if (!fs.existsSync(identityKeypairPath)) {
    throw new Error(
      `Expected test validator identity key pair at ${identityKeypairPath} but file not found`
    )
  }
  const validatorIdentityPath = identityKeypairPath
  const validatorIdentity = await parseKeypair(identityKeypairPath)

  // let's verify the leader schedule matches the validator identity
  const leaderSchedule = await connection.getLeaderSchedule()
  const isScheduledOnlyTestValidator = Object.keys(leaderSchedule).every(
    address => address === validatorIdentity.publicKey.toBase58()
  )
  if (!isScheduledOnlyTestValidator) {
    throw new Error(
      'Error on global setup: expected only test validator being run and scheduled as leader'
    )
  }

  const voteAccounts = await connection.getVoteAccounts()
  // expecting run on localhost and only one voting vote account is available
  // i.e., one validator solana-test-validator is voting and the validator identity is the same
  if (voteAccounts.current.length !== 1) {
    throw new Error(
      'Expected one vote account of solana-test-validator. Cannot continue in global local test setup.' +
        ` Number of vote accounts found: ${voteAccounts.current.length}`
    )
  }
  const votePubkey = new PublicKey(voteAccounts.current[0].votePubkey)
  if (
    voteAccounts.current[0].nodePubkey !==
    validatorIdentity.publicKey.toBase58()
  ) {
    throw new Error(
      `Expected validator identity ${validatorIdentity.publicKey.toBase58()} to be the same as the vote account node pubkey ${
        voteAccounts.current[0].nodePubkey
      }`
    )
  }

  return {
    votePubkey,
    validatorIdentity,
    validatorIdentityPath,
  }
}

async function parseKeypair(path: string): Promise<Keypair> {
  const fileContent = await readFile(path, 'utf-8')
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fileContent)))
}

// NOTE: the Anchor.toml should configure the lowest possible number for slots_per_epoch to 32,
//       otherwise waiting for activation could be too long and this method could timeout
export async function waitForStakeAccountActivation({
  stakeAccount,
  connection,
  timeoutSeconds = 30,
  activatedAtLeastFor = 0,
}: {
  stakeAccount: PublicKey
  connection: Connection
  timeoutSeconds?: number
  activatedAtLeastFor?: number
}) {
  // 1. waiting for the stake account to be activated
  {
    const startTime = Date.now()
    let stakeStatus = await connection.getStakeActivation(stakeAccount)
    while (stakeStatus.state !== 'active') {
      await sleep(1000)
      stakeStatus = await connection.getStakeActivation(stakeAccount)
      if (Date.now() - startTime > timeoutSeconds * 1000) {
        throw new Error(
          `Stake account ${stakeAccount.toBase58()} was not activated in timeout of ${timeoutSeconds} seconds`
        )
      }
    }

    // 2. the stake account is active, but it needs to be active for at least waitForEpochs epochs
    if (activatedAtLeastFor > 0) {
      connection.getParsedAccountInfo(stakeAccount)
      const stakeAccountData = await getStakeAccount(connection, stakeAccount)
      const stakeAccountActivationEpoch = stakeAccountData.activationEpoch
      if (stakeAccountActivationEpoch === null) {
        throw new Error(
          'Expected stake account to be already activated. Unexpected setup error stake account:' +
            stakeAccountData
        )
      }

      const currentEpoch = (await connection.getEpochInfo()).epoch
      if (
        currentEpoch <
        stakeAccountActivationEpoch.toNumber() + activatedAtLeastFor
      ) {
        console.debug(
          `Waiting for the stake account ${stakeAccount.toBase58()} to be active at least for ${activatedAtLeastFor} epochs ` +
            `currently active for ${
              currentEpoch - stakeAccountActivationEpoch.toNumber()
            } epoch(s)`
        )
        try {
          await waitForEpoch(
            connection,
            stakeAccountActivationEpoch.toNumber() + activatedAtLeastFor,
            timeoutSeconds
          )
        } catch (err) {
          console.error(
            `Stake account ${stakeAccount.toBase58()} was activated but timeout ${timeoutSeconds} elapsed when waiting ` +
              `for ${activatedAtLeastFor} epochs the account to be activated, it's activated only for ` +
              `${
                currentEpoch - stakeAccountActivationEpoch.toNumber()
              } epochs at this time`
          )
          throw err
        }
      }
    }
  }
}

export async function waitForEpoch(
  connection: Connection,
  targetEpoch: number,
  timeoutSeconds: number
) {
  const startTime = Date.now()
  let currentEpoch = (await connection.getEpochInfo()).epoch
  if (currentEpoch < targetEpoch) {
    console.debug(
      `Waiting for the epoch ${targetEpoch}, current epoch is ${currentEpoch}`
    )
  }
  while (currentEpoch < targetEpoch) {
    if (Date.now() - startTime > timeoutSeconds * 1000) {
      throw new Error(
        `Timeout ${timeoutSeconds} elapsed when waiting for epoch ${targetEpoch} (current epoch: ${currentEpoch})`
      )
    }
    await sleep(1000)
    currentEpoch = (await connection.getEpochInfo()).epoch
  }
}

export async function waitForNextEpoch(
  connection: Connection,
  timeoutSeconds: number
) {
  const currentEpoch = (await connection.getEpochInfo()).epoch
  await waitForEpoch(connection, currentEpoch + 1, timeoutSeconds)
}
