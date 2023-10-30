/* eslint-disable @typescript-eslint/no-explicit-any */

export type LoggerPlaceholder = {
    debug(...data:any): void
    info(...data:any): void
    warn(...data:any): void
    error(...data:any): void
}

export function logDebug(logger: any, ...data: any) {
    if (checkIfFunction<LoggerPlaceholder>(logger, 'debug')) {
      logger.debug(data)
    } else {
      console.debug(data)
    }
  }

export function logInfo(logger: any, data: any) {
    if (checkIfFunction<LoggerPlaceholder>(logger, 'info')) {
      logger.info(data)
    } else {
      console.log(data)
    }
  }

export function logWarn(logger: any, data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'warn')) {
    logger.warn(data)
  } else {
    console.warn(data)
  }
}

export function logError(logger: any, data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'error')) {
    logger.error(data)
  } else {
    console.error(data)
  }
}


function checkIfFunction<T>(logger: any | undefined, functionName: string): logger is T {
    return (logger !== undefined && typeof logger[functionName] !== 'function')
}