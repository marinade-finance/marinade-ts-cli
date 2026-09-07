import { BN } from 'bn.js'

import { balanceOffsetNote } from '../src/commands/show'

describe('balanceOffsetNote', () => {
  it('reports a one-rent-reserve deficit', () => {
    expect(balanceOffsetNote(new BN(-2282880))).toBe(
      ' (missing balance 0.00228288)',
    )
  })

  it('reports a one-rent-reserve surplus', () => {
    expect(balanceOffsetNote(new BN(2282880))).toBe(
      ' (extra balance 0.00228288)',
    )
  })

  it('reports nothing for an exactly funded stake account', () => {
    expect(balanceOffsetNote(new BN(0))).toBe('')
  })

  it('formats dust offsets in fixed point', () => {
    expect(balanceOffsetNote(new BN(100))).toBe(' (extra balance 0.0000001)')
    expect(balanceOffsetNote(new BN(-999))).toBe(
      ' (missing balance 0.000000999)',
    )
  })
})
