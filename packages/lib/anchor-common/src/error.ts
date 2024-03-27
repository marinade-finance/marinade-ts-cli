import { SendTransactionError } from '@solana/web3.js'
import {
  LoggerPlaceholder,
  checkErrorMessage,
  logError,
} from '@marinade.finance/ts-common'
import {
  parseIdlErrors,
  Idl,
  ProgramError,
  AnchorError,
} from '@coral-xyz/anchor'

export function verifyError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: any,
  idl: Idl | Map<number, string>,
  errCode: number,
  errMessage?: string,
  logger: LoggerPlaceholder | undefined = undefined
) {
  let anchorErrorMap: Map<number, string>
  if (idl instanceof Map) {
    anchorErrorMap = idl
  } else {
    anchorErrorMap = parseIdlErrors(idl)
  }
  const anchorErrorMsg = anchorErrorMap.get(errCode)
  if (anchorErrorMsg === undefined) {
    throw new Error(`Error ${errCode} not found in IDL`)
  }
  if (errMessage !== undefined && !anchorErrorMsg.includes(errMessage)) {
    throw new Error(
      `Error code ${errCode} belongs to Anchor error message '${anchorErrorMsg}' ` +
        `which does not match expected text '${errMessage}'`
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

  if (e instanceof ProgramError) {
    expect(e.msg).toStrictEqual(anchorErrorMsg)
    expect(e.code).toStrictEqual(errCode)
  } else if (e instanceof AnchorError) {
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
