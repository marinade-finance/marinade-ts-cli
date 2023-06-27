import { AnchorProvider } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Marinade, MarinadeConfig } from '@marinade.finance/marinade-ts-sdk'
import { getParsedStakeAccountInfo } from '@marinade.finance/marinade-ts-sdk/dist/src/util'
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  StakeProgram,
  Connection,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  SystemProgram,
  Signer,
} from '@solana/web3.js'
import { writeFileSync } from 'fs'
import path from 'path'
import { tmpdir } from 'os'

require('ts-node/register')

// 6LHBDKtwo69UKxWgY15vE3QykP4uf5DzZUgBiMzhEWpf
export const STAKE_ACCOUNT: Keypair = Keypair.fromSecretKey(
  new Uint8Array([
    18, 172, 235, 211, 112, 44, 110, 149, 4, 64, 227, 34, 56, 159, 198, 19, 146,
    61, 87, 180, 155, 178, 178, 146, 241, 198, 208, 91, 79, 219, 120, 107, 79,
    58, 194, 166, 138, 20, 154, 53, 107, 169, 158, 49, 96, 130, 207, 101, 203,
    106, 176, 103, 94, 13, 170, 98, 66, 69, 124, 209, 44, 76, 190, 136,
  ])
)
// 2APsntHoKXCeHWfxZ49ADwc5XrdB8GGmxK34jVXRYZyV
export const TEST_MARINADE_STATE_ADMIN = Keypair.fromSecretKey(
  new Uint8Array([
    88, 46, 254, 11, 76, 182, 135, 63, 92, 56, 112, 173, 43, 58, 65, 74, 13, 97,
    203, 36, 231, 178, 221, 92, 234, 200, 208, 114, 32, 230, 251, 217, 17, 67,
    199, 164, 137, 164, 176, 85, 236, 29, 246, 150, 180, 35, 94, 120, 30, 17,
    18, 138, 253, 155, 218, 23, 84, 125, 225, 110, 37, 142, 253, 100,
  ])
)
// 9wmxMQ2TFxYh918RzESjiA1dUXbdRAsXBd12JA1vwWQq
export const SDK_USER = Keypair.fromSecretKey(
  new Uint8Array([
    120, 45, 242, 38, 63, 135, 84, 226, 66, 56, 76, 216, 125, 144, 38, 182, 53,
    47, 169, 251, 128, 65, 185, 237, 41, 47, 64, 53, 158, 124, 64, 2, 132, 229,
    176, 107, 25, 190, 28, 223, 58, 136, 95, 237, 236, 176, 26, 160, 11, 12,
    131, 129, 21, 8, 221, 100, 249, 221, 177, 114, 143, 231, 102, 250,
  ])
)
// write the uint8 keypair array to a file
export const SDK_USER_PATH = path.join(tmpdir(), 'skd-user-keypair.json')
const jsonKeypair = Buffer.from(SDK_USER.secretKey).toJSON()
writeFileSync(SDK_USER_PATH, '[' + jsonKeypair.data.toString() + ']')

SDK_USER.secretKey
export const REFERRAL_CODE = new PublicKey(
  '2Q7u7ndBhSJpTNpDzkjvRyRvuzRLZSovkNRQ5SEUb64g'
)
const VOTE_ACCOUNT_PRECREATED = new PublicKey(
  '2YnuNkxgJFUR6rJDGRh3cgc17bjtYUWqCVc6Bc7JRpp4'
)

export const CONNECTION_COMMITMENT = 'confirmed'
export const PROVIDER_URL = 'http://localhost:8899'
export const CONNECTION = new Connection(PROVIDER_URL, {
  commitment: CONNECTION_COMMITMENT,
})
export const PROVIDER = new AnchorProvider(
  CONNECTION,
  new NodeWallet(SDK_USER),
  {
    commitment: CONNECTION_COMMITMENT /*, skipPreflight: true*/,
  }
)

export default async (): Promise<void> => {
  console.log('SDK User', SDK_USER.publicKey.toBase58())

  // --- GETTING VOTE ACCOUNT of solana-test-validator ---
  // as there is only solana-test-validator, it's a single vote account in the test network
  const votePubkey = await getSolanaTestValidatorVoteAccountPubkey()

  // --- CREATING STAKE ACCOUNT and DELEGATE ---
  // create a stake account that will be used later in all tests
  const tx = new Transaction()
  const ixStakeAccount = StakeProgram.createAccount({
    authorized: {
      staker: PROVIDER.wallet.publicKey,
      withdrawer: PROVIDER.wallet.publicKey,
    },
    fromPubkey: PROVIDER.wallet.publicKey,
    lamports: 2 * LAMPORTS_PER_SOL,
    stakePubkey: STAKE_ACCOUNT.publicKey,
  })
  tx.add(ixStakeAccount)
  /// delegating stake account to the vote account
  const ixDelegate = StakeProgram.delegate({
    authorizedPubkey: PROVIDER.wallet.publicKey,
    stakePubkey: STAKE_ACCOUNT.publicKey,
    votePubkey: VOTE_ACCOUNT_PRECREATED,
  })
  tx.add(ixDelegate)
  await PROVIDER.sendAndConfirm(tx, [STAKE_ACCOUNT])

  const stakeBalance = await CONNECTION.getBalance(STAKE_ACCOUNT.publicKey)
  await CONNECTION.getAccountInfo(STAKE_ACCOUNT.publicKey)
  if (!stakeBalance) {
    throw new Error('Jest global setup error: no stake account balance')
  }

  // --- WAITING FOR STAKE ACCOUNT to be READY ---
  const startTime = Date.now()
  console.log(
    `Waiting for stake account ${STAKE_ACCOUNT.publicKey.toBase58()} to be activated`
  )
  await waitForStakeAccountActivation({
    stakeAccount: STAKE_ACCOUNT.publicKey,
    provider: PROVIDER,
  })
  console.log(
    `Stake account ${STAKE_ACCOUNT.publicKey.toBase58()} is activated after ${
      (Date.now() - startTime) / 1000
    } s`
  )

  // --- ADDING solana-test-validator under MARINADE ---
  const config = new MarinadeConfig({
    connection: CONNECTION,
    publicKey: SDK_USER.publicKey,
  })
  const marinade = new Marinade(config)
  const marinadeState = await marinade.getMarinadeState()
  if (
    !marinadeState.state.validatorSystem.managerAuthority.equals(
      TEST_MARINADE_STATE_ADMIN.publicKey
    )
  ) {
    throw new Error(
      'Jest global setup error: Marinade state expected to be configured with the TestWorld admin authority.'
    )
  }
  // check if the validator is part of Marinade already
  const validators = await marinadeState.getValidatorRecords()
  if (
    validators.validatorRecords.findIndex(
      v => v.validatorAccount.toBase58() === votePubkey.toBase58()
    ) === -1
  ) {
    console.log(
      `Solana Test Validator vote account ${votePubkey.toBase58()} is not part of Marinade yet, adding it.`
    )
    const addIx = await addValidatorInstructionBuilder({
      marinade,
      validatorScore: 1000,
      rentPayer: PROVIDER.wallet.publicKey,
      validatorVote: votePubkey,
    })
    const addTx = new Transaction().add(addIx)
    await PROVIDER.sendAndConfirm(addTx, [TEST_MARINADE_STATE_ADMIN])
  }
}

async function addValidatorInstructionBuilder({
  marinade,
  validatorScore,
  validatorVote,
  rentPayer,
}: {
  marinade: Marinade
  validatorScore: number
  validatorVote: PublicKey
  rentPayer: PublicKey
}): Promise<TransactionInstruction> {
  const marinadeState = await marinade.getMarinadeState()
  return await marinade.marinadeFinanceProgram.program.methods
    .addValidator(validatorScore)
    .accountsStrict({
      state: marinadeState.marinadeStateAddress,
      validatorList: marinadeState.state.validatorSystem.validatorList.account,
      rentPayer,
      rent: SYSVAR_RENT_PUBKEY,
      validatorVote,
      managerAuthority: marinadeState.state.validatorSystem.managerAuthority,
      duplicationFlag: await marinadeState.validatorDuplicationFlag(
        validatorVote
      ),
      clock: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .instruction()
}

// Used for local solana-test-validator testing.
// The globalSetup.ts creates stake account and before it can be used one needs to wait for its activation.
// This function waits for the stake account to be activated.
// Plus, parameter 'activatedAtLeastFor' defines how many epochs the stake account has to be activated for to be considered OK.
//       The epoch activation for at least some epochs is required by Marinade to be able to delegate.
// ---
// When cannot be activated until timeout elapses an error is thrown.
// (The timeout is considered separately for waiting for activation and for epochs).
// ---
// NOTE: the Anchor.toml configures slots_per_epoch to 32,
//       so the timeout of 30 seconds should be enough for the stake account to be activated
export async function waitForStakeAccountActivation({
  stakeAccount = STAKE_ACCOUNT.publicKey,
  provider = PROVIDER,
  timeoutSeconds = 30,
  activatedAtLeastFor = 0,
}: {
  stakeAccount?: PublicKey
  provider?: AnchorProvider
  timeoutSeconds?: number
  activatedAtLeastFor?: number
}) {
  const connection = provider.connection
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
  }

  // 2. the stake account is active, but it needs to be active for at least waitForEpochs epochs
  if (activatedAtLeastFor > 0) {
    const stakeAccountData = await getParsedStakeAccountInfo(
      provider,
      stakeAccount
    )
    const stakeAccountActivationEpoch = stakeAccountData.activationEpoch
    if (stakeAccountActivationEpoch === null) {
      throw new Error(
        'Expected stake account to be already activated. Unexpected setup error stake account:' +
          stakeAccountData
      )
    }

    const startTime = Date.now()
    let currentEpoch = (await connection.getEpochInfo()).epoch
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
    }
    while (
      currentEpoch <
      stakeAccountActivationEpoch.toNumber() + activatedAtLeastFor
    ) {
      if (Date.now() - startTime > timeoutSeconds * 1000) {
        throw new Error(
          `Stake account ${stakeAccount.toBase58()} was activated but timeout ${timeoutSeconds} elapsed when waiting ` +
            `for ${activatedAtLeastFor} epochs the account to be activated, it's activated only for ` +
            `${
              currentEpoch - stakeAccountActivationEpoch.toNumber()
            } epochs at this time`
        )
      }
      await sleep(1000)
      currentEpoch = (await connection.getEpochInfo()).epoch
    }
  }
}

export const sleep = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms, undefined))
}

let solanaTestValidatorVotePubkey: PublicKey | undefined
export async function getSolanaTestValidatorVoteAccountPubkey(): Promise<PublicKey> {
  if (solanaTestValidatorVotePubkey === undefined) {
    const voteAccounts = await CONNECTION.getVoteAccounts()
    // expecting run on localhost and only one vote account is available, i.e., one validator solana-test-validator
    if (voteAccounts.current.length !== 1) {
      throw new Error(
        'Expected one vote account of solana-test-validator. Cannot continue in global local test setup.' +
          ` Number of vote accounts found: ${voteAccounts.current.length}`
      )
    }
    solanaTestValidatorVotePubkey = new PublicKey(
      voteAccounts.current[0].votePubkey
    )
  }

  return solanaTestValidatorVotePubkey
}

export async function transfer({
  amountSol = 100,
  from = SDK_USER,
  to,
  provider = PROVIDER,
}: {
  amountSol?: number
  from?: Signer
  to: PublicKey
  provider?: AnchorProvider
}) {
  const lamports = amountSol * LAMPORTS_PER_SOL
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports,
    })
  )
  await provider.sendAndConfirm(tx, [from])
}
