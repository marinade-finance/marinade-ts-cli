import { PublicKey } from '@solana/web3.js'
import {
  AccountInfoBytes,
  AddedAccount,
  AddedProgram,
  startAnchor,
} from 'solana-bankrun'
import 'reflect-metadata'
import {
  Expose, // eslint-disable-line @typescript-eslint/no-unused-vars
  Transform, // eslint-disable-line @typescript-eslint/no-unused-vars
  Type, // eslint-disable-line @typescript-eslint/no-unused-vars
  plainToInstance,
} from 'class-transformer'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'fs'
import { join } from 'path'
import { BankrunExtendedProvider } from './extendedProvider'

// note: VsCode error:
//       https://github.com/microsoft/TypeScript/issues/52396#issuecomment-1409152884
//       https://bobbyhadz.com/blog/typescript-experimental-support-for-decorators-warning#solve-the-error-in-visual-studio-code
export class JsonAccountData {
  @Expose()
  @Transform(({ value }) => Number(value))
  lamports!: number

  @Expose()
  data!: string[]

  @Expose()
  @Transform(({ value }) => new PublicKey(value))
  owner!: PublicKey

  @Expose()
  @Transform(({ value }) => Boolean(value))
  executable!: boolean

  @Expose()
  @Transform(({ value }) => Number(value))
  rentEpoch!: number
}
export class JsonAccount {
  @Expose()
  @Transform(({ value }) => new PublicKey(value))
  pubkey!: PublicKey

  @Expose()
  @Type(() => JsonAccountData)
  account!: JsonAccountData
}

export function toAccountInfoBytes(jsonAccount: JsonAccount): AccountInfoBytes {
  const dataField = jsonAccount.account.data
  return {
    executable: jsonAccount.account.executable,
    owner: jsonAccount.account.owner,
    lamports: jsonAccount.account.lamports,
    data: Buffer.from(dataField[0], dataField[1] as BufferEncoding),
    rentEpoch: jsonAccount.account.rentEpoch,
  }
}

export function loadAccountsFromDirectory(directory: string): AddedAccount[] {
  const accounts: AddedAccount[] = []
  for (const jsonFile of readdirSync(directory, {
    recursive: true,
    encoding: null,
  }).filter(f => f.endsWith('.json'))) {
    const jsonPath = join(directory, jsonFile)
    const loadedAccount = loadAccountFromJson(jsonPath)
    accounts.push(loadedAccount)
  }
  return accounts
}

export function loadAccountFromJson(jsonPath: string): AddedAccount {
  const fileBuffer = readFileSync(jsonPath)
  const parsedData = JSON.parse(fileBuffer.toString())
  const jsonAccount: JsonAccount = plainToInstance(JsonAccount, parsedData)
  return {
    address: jsonAccount.pubkey,
    info: toAccountInfoBytes(jsonAccount),
  }
}

export type ProgramInputData = {
  name: string
  path?: string
  pubkey: PublicKey
}

export function loadPrograms(programs: ProgramInputData[]): AddedProgram[] {
  const addedPrograms: AddedProgram[] = []
  let hookDeleteDir = false
  const hookDeleteProgramNames: string[] = []
  // programs that should be loaded just by name based on the rules of the solana-test-program
  programs
    .filter(p => p.path === undefined)
    .forEach(p => {
      addedPrograms.push({
        name: p.name!,
        programId: p.pubkey,
      })
    })
  // programs that provided the path would be copied to the fixtures directory where
  // the solana-test-program looks for the program data
  // see: https://github.com/solana-labs/solana/blob/v1.18.14/program-test/src/lib.rs#L428
  const fixturesPath = join(process.cwd(), 'tests', 'fixtures')
  if (!existsSync(fixturesPath)) {
    mkdirSync(fixturesPath, { recursive: true })
    hookDeleteDir = true
  }
  for (const { pubkey, path, name } of programs.filter(
    p => p.path !== undefined
  )) {
    const programPath = path!
    if (!existsSync(programPath)) {
      console.error(
        `bankrun startup: program ${pubkey.toBase58()} at path ${programPath} does not exist cannot be loaded`
      )
      continue
    }
    const fixturesProgramSoPath = join(fixturesPath, `${name}.so`)
    if (existsSync(fixturesProgramSoPath)) {
      console.log(
        `bankrun startup: skipping to upload the program ${pubkey.toBase58()} from path ${path} to ${fixturesProgramSoPath} as it already exists`
      )
    } else {
      console.debug(
        'bankrun startup: copying program',
        fixturesProgramSoPath,
        'to',
        fixturesProgramSoPath
      )
      cpSync(programPath, fixturesProgramSoPath)
      hookDeleteProgramNames.push(fixturesProgramSoPath)
    }
    addedPrograms.push({
      name,
      programId: pubkey,
    })
  }

  // TODO: exit hooks somehow does not work in jest
  registerCleanup(() => {
    hookDeleteProgramNames.forEach(p => {
      console.log('Deleting program file', p)
      rmSync(p)
    })
    if (hookDeleteDir) {
      console.log('Deleting fixtures directory', fixturesPath)
      rmSync(fixturesPath, { recursive: true, force: true })
    }
    hookDeleteProgramNames.length = 0
    hookDeleteDir = false
  })

  return addedPrograms
}

function registerCleanup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exitHandler: (options: any, exitCode: any) => void
): void {
  // do something when app is closing
  process.on('exit', exitHandler.bind(null, { cleanup: true }))
  process.on('beforeExit', exitHandler.bind(null, { cleanup: true }))
  process.on('disconnect', exitHandler.bind(null, { cleanup: true }))
  process.on('terminate', exitHandler.bind(null, { cleanup: true }))

  // catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, { exit: true }))
  process.on('SIGQUIT', exitHandler.bind(null, { exit: true }))

  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
  process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

  // catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
}

/*
 * This is a bit of assumption. The base data is taken from `solana rent` calls.
 * Cannot find the real code of the getMinimumBalanceForRentExemption function.
 *
 * solana rent -um 0
 * > Rent-exempt minimum: 0.00089088 SOL
 * solana rent -um 1
 * > Rent-exempt minimum: 0.00089784 SOL
 */
export function calculateRentExemption(dataSize: number) {
  const basePaymentLamports = 890880
  const perByteLamports = 6960
  return basePaymentLamports + perByteLamports * dataSize
}

/**
 * Initializing the test with bankrun.
 *
 * @param accountDirs - expecting directory paths with '.json' files with account data within
 * @param accounts - expecting JSON files provided with account data (one may override the pubkey of the account)
 * @param programs - expecting the program data to be loaded, the program data is taken based on the provided name which has to be aligned with filename with suffix '.so'
 *                   this came from how the solana-test-program loads the program data, on top of that it's possible to define path
 *                   and some copy operation is done further.
 *                   The 'name' and 'pubkey' is required as it's the way how the program is loaded in solana-test-program.
 *                   The 'pubkey' is the pubkey the program will be registered at.
 *                   The 'name' is used as target filename that is searched or 'path' copied to.
 *                   The 'path' is optional and when provided the file is copied to place where the solana-test-program looks for the program data.
 *                   see: https://github.com/solana-labs/solana/blob/v1.18.14/program-test/src/lib.rs#L428
 */
export async function testInit({
  accountDirs,
  accounts,
  programs,
}: {
  accountDirs?: string[]
  accounts?: { pubkey?: PublicKey; path: string }[]
  programs?: { name: string; path?: string; pubkey: PublicKey }[]
}): Promise<BankrunExtendedProvider> {
  let additionalAccounts: AddedAccount[] = []
  let additionalPrograms: AddedProgram[] = []
  if (accountDirs !== undefined) {
    additionalAccounts = accountDirs.flatMap(loadAccountsFromDirectory)
  }
  if (accounts !== undefined) {
    additionalAccounts.push(
      ...accounts.flatMap(acc => {
        const accountData = loadAccountFromJson(acc.path)
        if (acc.pubkey !== undefined) {
          // rewriting the address when passed in
          accountData.address = acc.pubkey
        }
        return accountData
      })
    )
  }
  if (programs !== undefined) {
    additionalPrograms = loadPrograms(programs)
  }

  const context = await startAnchor(
    './',
    additionalPrograms,
    additionalAccounts
  )
  return new BankrunExtendedProvider(context)
}
