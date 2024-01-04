import pino, { Logger } from 'pino'

export function configureLogger(level = 'info'): Logger {
  const pinoAdditionalOptions = process.env.NODE_ENV?.startsWith('prod')
    ? {
        singleLine: true,
        errorLikeObjectKeys: [],
      }
    : {}
  const logger: Logger = pino(
    {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
          ...pinoAdditionalOptions,
        },
      },
      level: level,
    },
    pino.destination()
  )
  return logger
}
