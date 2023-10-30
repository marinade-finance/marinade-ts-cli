/* eslint-disable @typescript-eslint/no-explicit-any */

export type LoggerPlaceholder = LoggerDebugAble &
  LoggerInfoAble &
  LoggerWarnAble &
  LoggerErrorAble
export type LoggerDebugAble = {
  debug(...data: any): void
}
export type LoggerInfoAble = {
  info(...data: any): void
}
export type LoggerWarnAble = {
  warn(...data: any): void
}
export type LoggerErrorAble = {
  error(...data: any): void
}

export function logDebug(logger: object | undefined, ...data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'debug')) {
    logger.debug(data)
  } else {
    console.debug(data)
  }
}

export function logInfo(logger: object | undefined, data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'info')) {
    logger.info(data)
  } else {
    console.log(data)
  }
}

export function logWarn(logger: object | undefined, data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'warn')) {
    logger.warn(data)
  } else {
    console.warn(data)
  }
}

export function logError(logger: object | undefined, data: any) {
  if (checkIfFunction<LoggerPlaceholder>(logger, 'error')) {
    logger.error(data)
  } else {
    console.error(data)
  }
}

export function isLevelEnabled(
  logger: any | undefined,
  level: string
): boolean | undefined {
  if (logger === undefined) {
    return undefined
  }
  let levelEnabled = false
  if (!checkIfFunction<LoggerIsLevelEnabled>(logger, 'isLevelEnabled')) {
    levelEnabled = logger.isLevelEnabled(level)
  } else if (!levelEnabled && level in logger) {
    const loggerLevel = (logger as unknown as any).level
    levelEnabled = searchIfLabelIsEnabled(loggerLevel as string, level)
  }
  return levelEnabled
}

function checkIfFunction<T>(
  logger: any | undefined,
  functionName: string
): logger is T {
  return logger !== undefined && typeof logger[functionName] !== 'function'
}

function searchIfLabelIsEnabled(
  currentLevel: string,
  desiredLevel: string
): boolean {
  const levels = ['error', 'warn', 'info', 'debug', 'trace']
  currentLevel = currentLevel.toLowerCase()
  desiredLevel = desiredLevel.toLowerCase()
  const currentLevelIndex = levels.indexOf(currentLevel)
  const desiredLevelIndex = levels.indexOf(desiredLevel)
  return currentLevelIndex !== -1 && currentLevelIndex >= desiredLevelIndex
}

type LoggerIsLevelEnabled = {
  isLevelEnabled(level: string): boolean
}
