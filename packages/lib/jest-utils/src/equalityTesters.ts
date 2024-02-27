import { expect } from '@jest/globals'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

// Use to global configuration of Jest
/*
 * / * * @type {import('ts-jest').JestConfigWithTsJest} * /
 * module.exports = {
 *   setupFilesAfterEnv: ['<rootDir>/setup/equalityTesters.ts'],
 * }
 */

/**
 * Equality testers for jest to compare BN and PublicKey.
 */
expect.addEqualityTesters([
  // Numbers
  (a, b) => {
    a = convertNumberToBN(a)
    b = convertNumberToBN(b)
    if (a instanceof BN) {
      return a.eq(b as BN)
    }
    return undefined
  },
  // Public key
  (a, b) => {
    if (a instanceof PublicKey) {
      return a.equals(b as PublicKey)
    }
    return undefined
  },
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertNumberToBN(value: any): any {
  if (typeof value === 'bigint') {
    return new BN(value.toString())
  }
  if (typeof value === 'number') {
    return new BN(value)
  }
  return value
}
