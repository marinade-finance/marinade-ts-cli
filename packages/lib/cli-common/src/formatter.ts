import { Keypair, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import YAML from 'yaml'
import { CliCommandError } from './error'

export const FORMAT_TYPE_DEF = ['text', 'yaml', 'json'] as const
export type FormatType = (typeof FORMAT_TYPE_DEF)[number]

export function print_data(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  format: FormatType,
  valueName = '--format'
): void {
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

/**
 * This is the action call for the {@link reformat} function.
 * The formatter processing function may ask the reformat function
 * to use what was processed or remove the key from the output
 * or to pass the processing with next call of {@link reformat} recursively.
 */
export type ReformatAction =
  // reformat function to place the values in the new keys
  // do not pass the processing to the next formatter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: 'UseExclusively'; records: { key: string; value: any }[] }

  // remove the current key from the output
  | { type: 'Remove' }

  // process through object recursively to reformat next formatter in chain
  | { type: 'UsePassThrough' }

/**
 * Function that can be used to format show output
 * checking based on the key name.
 * The returned value is used as a new value to be used to show,
 * if the function returns undefined the value is not used to show
 * and the value will be processed further.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObjectFormatterFn = (key: string, value: any) => ReformatAction

export interface ObjectFormatterInterface {
  format: ObjectFormatterFn
}

export class BaseObjectFormatter implements ObjectFormatterInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  format(_key: string, _value: any): ReformatAction {
    return { type: 'UsePassThrough' }
  }
}

/**
 * Chaining different format functions. First one that returns a value is used.
 */
export class ChainedKeyNameFormatter extends BaseObjectFormatter {
  readonly formatters: ObjectFormatterFn[] = []

  constructor(...formatters: ObjectFormatterFn[]) {
    super()
    this.formatters = formatters
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format(key: string, value: any): ReformatAction {
    for (const formatFn of this.formatters) {
      const result = formatFn(key, value)
      if (result.type !== 'UsePassThrough') {
        // we found one formatter that matches and we just stop chain processing
        // and returning the value
        return result
      }
    }
    return { type: 'UsePassThrough' }
  }

  addFormatter(formatter: ObjectFormatterFn): void {
    formatter && this.formatters.push(formatter)
  }
}

/**
 * Main formatting function for `show` command.
 * It takes the value to be shown and tries to make it more readable.
 */
export function reformat(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
  formatter: ObjectFormatterFn | BaseObjectFormatter = new BaseObjectFormatter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  let result: any // eslint-disable-line @typescript-eslint/no-explicit-any
  if (value === null) {
    result = null
  } else if (value instanceof BN) {
    try {
      return value.toNumber()
    } catch (e) {
      return value.toString(10)
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
  } else if (value instanceof Function) {
    return (value as Function).name
  } else if (Array.isArray(value)) {
    result = value.map(v => reformat(v, formatter))
  } else if (typeof value === 'object') {
    result = {}
    Object.entries(value).forEach(([key, value]) => {
      const formatterResult =
        formatter instanceof BaseObjectFormatter
          ? formatter.format(key, value)
          : (formatter as ObjectFormatterFn)(key, value)
      switch (formatterResult.type) {
        case 'UseExclusively': {
          formatterResult.records.forEach(
            ({ key: formattedKey, value: formattedValue }) => {
              result[formattedKey] = formattedValue
            }
          )
          break
        }
        case 'Remove': {
          break
        }
        default: {
          // UsePassThrough
          result[key] = reformat(value, formatter)
          break
        }
      }
    })
  } else {
    result = value
  }
  return result
}

/**
 * Contracts often use `reserved` fields to store the length of bytes
 * that are empty and are left for future changes in the account structure.
 * Normally the array is represented by Yaml or Json as list of fields
 * where all, in this case' of value <index>:0.
 * This reformat function changes the representation to the length of the array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reformatReserved(key: string, value: any): ReformatAction {
  if (
    typeof key === 'string' &&
    (key as string).startsWith('reserved') &&
    (Array.isArray(value) || value instanceof Uint8Array)
  ) {
    return { type: 'UseExclusively', records: [{ key, value: [value.length] }] }
  }
  return { type: 'UsePassThrough' }
}
