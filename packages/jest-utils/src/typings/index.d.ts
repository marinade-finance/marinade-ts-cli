export {}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveMatchingSpawnOutput(
        expected:
          | number
          | string
          | RegExp
          | {
              // The exit code
              code?: number
              // The signal that terminated the proces
              // for example, 'SIGTERM' or 'SIGKILL'
              signal?: string
              // The stdout from the process
              stdout?: string | RegExp
              // The stderr from the process
              stderr?: string | RegExp
            }
      ): Promise<R>
    }
  }
}
