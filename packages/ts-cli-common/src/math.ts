export function rand(to = 1000, from = 1): number {
  return Math.floor(from + Math.random() * (to - from + 1))
}
