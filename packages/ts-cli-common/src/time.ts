export function formatDuration(seconds: number): string {
  const units = [
    { unit: 's', mod: 60, pad: 2 },
    { unit: 'm', mod: 60, pad: 2 },
    { unit: 'h', mod: 24, pad: 2 },
    { unit: 'd' },
  ]
  const parts: string[] = []
  let rem = seconds
  for (const { unit, mod, pad } of units) {
    const amount = mod ? rem % mod : rem
    if (mod) {
      rem = Math.floor(rem / mod)
    }

    const formattedAmount =
      rem === 0 ? amount : amount.toString().padStart(pad ?? 0, '0')
    parts.unshift(`${formattedAmount}${unit}`)

    if (rem === 0) {
      break
    }
  }

  return parts.join(' ')
}
