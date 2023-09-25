import { Keypair, PublicKey } from '@solana/web3.js'
import { CliCommandError } from './error'
import YAML from 'yaml'
import BN from 'bn.js'

export type FORMAT_TYPE = 'text' | 'yaml' | 'json'

export function print_data(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  format: FORMAT_TYPE,
  valueName = '--format'
): void {
  data = reformat(data)
  if (format === 'text') {
    console.log(data)
  } else if (format === 'yaml') {
    console.log(YAML.stringify(data).trimEnd())
  } else if (format === 'json') {
    console.log(JSON.stringify(data).trimEnd())
  } else {
    throw new CliCommandError({
      valueName,
      value: format,
      msg: 'Not supported format type',
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPublicKey(value: any): value is PublicKey {
  return (
    (value?.constructor?.name === 'PublicKey' &&
      value?.toBase58 !== undefined) ||
    value instanceof PublicKey
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reformat(value: any): any {
  let result: any // eslint-disable-line @typescript-eslint/no-explicit-any
  if (value === null) {
    result = null
  } else if (value instanceof BN) {
    try {
      return value.toNumber()
    } catch (e) {
      return value.toString()
    }
  } else if (value instanceof BigInt || typeof value === 'bigint') {
    result = value.toString()
  } else if (isPublicKey(value)) {
    if (value.equals(PublicKey.default)) {
      result = null // system program is used as null key
    } else {
      result = value.toBase58()
    }
  } else if (value instanceof Keypair) {
    result = value.publicKey.toBase58()
  } else if (
    // considering the value is an array used for space reserve for the account
    typeof value === 'object' &&
    value?.key !== undefined &&
    typeof value.key === 'string' &&
    (value.key as string).startsWith('reserved') &&
    (Array.isArray(value) || value instanceof Uint8Array)
  ) {
    return [value.length]
  } else if (Array.isArray(value)) {
    result = value.map(v => reformat(v))
  } else if (typeof value === 'object') {
    result = {}
    Object.entries(value).forEach(([key, value]) => {
      result[key] = reformat(value)
    })
  } else {
    result = value
  }
  return result
}
