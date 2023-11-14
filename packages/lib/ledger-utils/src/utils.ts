/**
 * Generating all combinations for derivation path.
 * When maxDepth is 2 and maxLength is 2, the result is:
 * [[], [0], [1], [2], [0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]]
 */
export function generateAllCombinations(
  maxDepth: number | undefined,
  maxLength: number | undefined
): number[][] {
  if (maxDepth === undefined || maxLength === undefined) {
    return []
  }

  const combinations: number[][] = [[]]
  function generate(prefix: number[], remainingLength: number): void {
    if (remainingLength === 0) {
      combinations.push(prefix)
      return
    }
    for (let i = 0; i <= maxDepth!; i++) {
      generate([...prefix, i], remainingLength - 1)
    }
  }
  for (let length = 1; length <= maxLength; length++) {
    generate([], length)
  }
  return combinations
}
