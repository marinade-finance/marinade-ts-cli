import { getHeuristicDepthAndWide, parseLedgerUrl } from '../src/ledger'
import { PublicKey } from '@solana/web3.js'

describe('Ledger', () => {
  it('should parse a valid Ledger URL', () => {
    const url = 'usb://ledger?key=1234/5678'
    expect(parseLedgerUrl(url)).toEqual({
      parsedPubkey: undefined,
      parsedDerivedPath: "44'/501'/1234/5678",
    })

    const url2 = 'usb://ledger'
    expect(parseLedgerUrl(url2)).toEqual({
      parsedPubkey: undefined,
      parsedDerivedPath: "44'/501'",
    })

    const url3 = 'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
    expect(parseLedgerUrl(url3)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: "44'/501'",
    })

    const url4 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=0'
    expect(parseLedgerUrl(url4)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: "44'/501'/0",
    })

    const url6 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=/0/0'
    expect(parseLedgerUrl(url6)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: "44'/501'/0/0",
    })

    const url7 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key='
    expect(parseLedgerUrl(url7)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: "44'/501'",
    })

    const url8 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=44/501/1/2/3'
    expect(parseLedgerUrl(url8)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: '44/501/1/2/3',
    })

    const url9 =
      "usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=44/501/0'/0'/0'"
    expect(parseLedgerUrl(url9)).toEqual({
      parsedPubkey: new PublicKey(
        'GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
      ),
      parsedDerivedPath: "44/501/0'/0'/0'",
    })
  })

  it('should throw an error for an invalid Ledger URL', () => {
    const url = 'invalid-url'
    expect(() => parseLedgerUrl(url)).toThrowError(
      'Invalid ledger url invalid-url. Expected url started with "usb://ledger"'
    )
  })

  it('should get correct heuristic wide and depth', () => {
    expect(getHeuristicDepthAndWide("44/501/0'/0'/0'", 0, 0)).toEqual({
      depth: 0,
      wide: 3,
    })
    expect(getHeuristicDepthAndWide("44/501/0'/0'/0'", 5, 1)).toEqual({
      depth: 5,
      wide: 3,
    })
    expect(getHeuristicDepthAndWide("44/501/0'/0'/0'", 0, 4)).toEqual({
      depth: 0,
      wide: 4,
    })
    expect(getHeuristicDepthAndWide("44/501/0'/6'/0'", 1, 1)).toEqual({
      depth: 6,
      wide: 3,
    })
    expect(getHeuristicDepthAndWide("44/501/0'/6'/7'", 1, 1)).toEqual({
      depth: 7,
      wide: 3,
    })
    expect(getHeuristicDepthAndWide("44/501/8'/0'/0'/0'", 5, 10)).toEqual({
      depth: 8,
      wide: 10,
    })
  })
})
