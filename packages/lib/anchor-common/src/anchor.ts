import * as anchor from '@coral-xyz/anchor'
import { SendTransactionError } from '@solana/web3.js'
import { LoggerPlaceholder, logError } from '@marinade.finance/ts-common'

export function verifyError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  idl: anchor.Idl | Map<number, string>,
  errCode: number,
  errMessage?: string,
  logger: LoggerPlaceholder | undefined = undefined
) {
  let anchorErrorMap: Map<number, string>
  if (idl instanceof Map) {
    anchorErrorMap = idl
  } else {
    anchorErrorMap = anchor.parseIdlErrors(idl)
  }
  const anchorErrorMsg = anchorErrorMap.get(errCode)
  if (anchorErrorMsg === undefined) {
    throw new Error(`Error ${errCode} not found in IDL`)
  }
  if (errMessage !== undefined && !anchorErrorMsg.includes(errMessage)) {
    throw new Error(
      `Error ${errCode} with message ${anchorErrorMsg} ` +
        `does not match expected errMessage ${errMessage}`
    )
  }
  let decNum: number
  if (errCode.toString().startsWith('0x')) {
    decNum = parseInt(errCode.toString(), 16)
  } else {
    decNum = parseInt(errCode.toString())
  }
  const hexNumber = '0x' + decNum.toString(16)
  const decimalNumber = decNum.toString()

  if (e instanceof anchor.ProgramError) {
    expect(e.msg).toStrictEqual(anchorErrorMsg)
    expect(e.code).toStrictEqual(errCode)
  } else if (e instanceof anchor.AnchorError) {
    expect(e.error.errorMessage).toStrictEqual(anchorErrorMsg)
    expect(e.error.errorCode.number).toStrictEqual(errCode)
  } else if (e instanceof SendTransactionError) {
    expect(e.logs).toBeDefined()
    expect(e.logs!.find(l => l.indexOf(anchorErrorMsg) > -1)).toBeDefined()
  } else if (e && 'cause' in e && e.cause) {
    if (!checkErrorMessage(e, errCode)) {
      verifyError(e.cause, idl, errCode, errMessage, logger)
    }
  } else if (
    !checkErrorMessage(e, decimalNumber) &&
    !checkErrorMessage(e, hexNumber)
  ) {
    logError(logger, `Error does not include error number '${errCode}: [${e}]`)
    throw e
  }
}

type ToString = { toString(): string }

export function checkErrorMessage(e: unknown, message: ToString): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof e.message === 'string' &&
    e.message.includes(message.toString())
  )
}
