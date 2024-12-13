import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { readFile } from 'fs/promises'
import fs from 'fs'
import { sleep } from '@marinade.finance/ts-common'
import { getStakeAccount } from '@marinade.finance/web3js-common'
import { waitForEpoch } from '@marinade.finance/web3js-common'
import { getStakeActivation } from '@anza-xyz/solana-rpc-get-stake-activation'

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
  const anchorValidatorVoteAccounts = voteAccounts.current.filter(
    v => v.nodePubkey === validatorIdentity.publicKey.toBase58()
  )
  if (anchorValidatorVoteAccounts.length <= 0) {
    throw new Error(
      'Expected solana-test-validator to be voting. Cannot continue in global local test setup. ' +
        `No one with "nodePubkey" of validator ${validatorIdentity.publicKey.toBase58()}. ` +
        `Number of all vote accounts found: ${voteAccounts.current.length}`
    )
  }
  if (anchorValidatorVoteAccounts.length > 1) {
    throw new Error(
      'Expected one vote account of solana-test-validator. Cannot continue in global local test setup.' +
        `More vote accounts of "nodePubkey" of validator ${validatorIdentity.publicKey.toBase58()}. ` +
        ` Number of solana-test-validator vote accounts found: ${anchorValidatorVoteAccounts.length}`
    )
  }
  const votePubkey = new PublicKey(anchorValidatorVoteAccounts[0].votePubkey)

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
    let stakeStatus = await getStakeActivation(connection, stakeAccount)
    while (stakeStatus.status !== 'active') {
      await sleep(1000)
      stakeStatus = await getStakeActivation(connection, stakeAccount)
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
