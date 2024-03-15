import { PublicKey } from '@solana/web3.js'
import { AccountInfoBytes, AddedAccount, startAnchor } from 'solana-bankrun'
import 'reflect-metadata'
import {
  Expose, // eslint-disable-line @typescript-eslint/no-unused-vars
  Transform, // eslint-disable-line @typescript-eslint/no-unused-vars
  Type, // eslint-disable-line @typescript-eslint/no-unused-vars
  plainToInstance,
} from 'class-transformer'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
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

export function loadAccountsFromJson(directory: string): AddedAccount[] {
  const accounts: JsonAccount[] = []
  for (const jsonFile of readdirSync(directory).filter(f =>
    f.endsWith('.json')
  )) {
    const jsonPath = path.join(directory, jsonFile)
    const fileBuffer = readFileSync(jsonPath)
    const parsedData = JSON.parse(fileBuffer.toString())
    const jsonAccount: JsonAccount = plainToInstance(JsonAccount, parsedData)
    accounts.push(jsonAccount)
  }
  return accounts.map(jsonAccount => {
    return {
      address: jsonAccount.pubkey,
      info: toAccountInfoBytes(jsonAccount),
    }
  })
}

// consider using as accountDirs: ./fixtures/accounts/
export async function testInit(
  accountDirs?: string[]
): Promise<BankrunExtendedProvider> {
  let additionalAccounts: AddedAccount[] = []
  if (accountDirs !== undefined) {
    additionalAccounts = accountDirs.flatMap(dir => loadAccountsFromJson(dir))
  }
  const context = await startAnchor('./', [], additionalAccounts)
  return new BankrunExtendedProvider(context)
}
