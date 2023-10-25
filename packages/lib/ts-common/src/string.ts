// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeStr(repetitionOfChar: number, baseChar?: any) {
  return Array.prototype.join.call(
    { length: (repetitionOfChar || -1) + 1 },
    (baseChar as string) || 'x'
  )
}
