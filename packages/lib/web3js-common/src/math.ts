import BN from 'bn.js'

export function toBigint(convertNumber: number | bigint | BN): bigint {
  if (BN.isBN(convertNumber)) {
    return BigInt(convertNumber.toString())
  } else if (typeof convertNumber === 'number') {
    return BigInt(convertNumber)
  } else {
    return convertNumber
  }
}
