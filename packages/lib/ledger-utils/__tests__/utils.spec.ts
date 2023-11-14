import { generateAllCombinations } from '../src/utils'

describe('Ledger utils', () => {
  it('should generate combinations', () => {
    const combinations = generateAllCombinations(2, 2)
    expect(combinations).toEqual([
      [],
      [0],
      [1],
      [2],
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ])
    const combinationsZero = generateAllCombinations(0, 5)
    expect(combinationsZero).toEqual([
      [],
      [0],
      [0, 0],
      [0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ])
    const combinationsUndefined = generateAllCombinations(100, undefined)
    expect(combinationsUndefined).toEqual([])
  })
})
