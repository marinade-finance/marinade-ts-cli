const exitSignalsToCode: Map<string, number> = new Map([
  ['SIGINT', 130],
  ['SIGQUIT', 131],
  ['SIGTERM', 143],
  ['exit', 0],
])
export const EXIT_SIGNALS = Array.from(exitSignalsToCode.keys())

const scheduledSignalsToHooks: Map<string, (() => void)[]> = new Map()

function scheduleHook(hook: () => void, signal: string): void {
  if (!scheduledSignalsToHooks.has(signal) && process) {
    process.on(signal, () => {
      runHooks(signal)
    })
  }
  scheduledSignalsToHooks.set(signal, [
    ...(scheduledSignalsToHooks.get(signal) ?? []),
    hook,
  ])
}

function runHooks(signal: string): void {
  const hooks = scheduledSignalsToHooks.get(signal)
  if (hooks) {
    hooks.forEach((hook, index) => {
      try {
        hook()
      } catch (e) {
        // ignore error and go to next hook
        console.error(
          `Signal ${signal} hook ${index + 1}/${hooks.length} failed`,
          e
        )
      }
    })
  }
  if (EXIT_SIGNALS.includes(signal)) {
    // eslint-disable-next-line no-process-exit
    process.exit(exitSignalsToCode.get(signal) ?? 0)
  }
}

export function scheduleOn(hook: () => void, ...signals: string[]): void {
  signals.forEach(signal => scheduleHook(hook, signal))
}

export function scheduleOnExit(hook: () => void): void {
  scheduleOn(hook, ...EXIT_SIGNALS)
}
