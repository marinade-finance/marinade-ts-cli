/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-extra-semi */

import { PublicKey } from '@solana/web3.js'
import { BinaryReader, BinaryWriter } from 'borsh'
import base58 from 'bs58'

export type StringPublicKey = string
export function extendBorsh() {
  ;(BinaryReader.prototype as any).readPubkey = function () {
    const reader = this as unknown as BinaryReader
    const array = reader.readFixedArray(32)
    return new PublicKey(array)
  }
  ;(BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter
    writer.writeFixedArray(value.toBuffer())
  }
  ;(BinaryReader.prototype as any).readPubkeyAsString = function () {
    const reader = this as unknown as BinaryReader
    const array = reader.readFixedArray(32)
    return base58.encode(array) as StringPublicKey
  }
  ;(BinaryWriter.prototype as any).writePubkeyAsString = function (
    value: StringPublicKey,
  ) {
    const writer = this as unknown as BinaryWriter
    writer.writeFixedArray(base58.decode(value))
  }
}
