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
