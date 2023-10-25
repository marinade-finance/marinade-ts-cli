import { parseLedgerUrl } from '../src/ledger'
import { PublicKey } from '@solana/web3.js'

describe('Ledger', () => {
  it('should parse a valid Ledger URL', () => {
    const url = 'usb://ledger?key=1234/5678'
    expect(parseLedgerUrl(url)).toEqual({
      pubkey: undefined,
      derivedPath: "44'/501'/1234/5678",
    })

    const url2 = 'usb://ledger'
    expect(parseLedgerUrl(url2)).toEqual({
      pubkey: undefined,
      derivedPath: "44'/501'/0'/0'",
    })

    const url3 = 'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'
    expect(parseLedgerUrl(url3)).toEqual({
      pubkey: new PublicKey('GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'),
      derivedPath: "44'/501'/0'/0'",
    })

    const url4 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=0'
    expect(parseLedgerUrl(url4)).toEqual({
      pubkey: new PublicKey('GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'),
      derivedPath: "44'/501'/0",
    })

    const url5 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key='
    expect(parseLedgerUrl(url5)).toEqual({
      pubkey: new PublicKey('GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'),
      derivedPath: "44'/501'/0'/0'",
    })

    const url6 =
      'usb://ledger/GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV?key=44/501/1/2/3'
    expect(parseLedgerUrl(url6)).toEqual({
      pubkey: new PublicKey('GontTwDeBduvbW85oHyC8A7GekuT8X1NkZHDDdUWWvsV'),
      derivedPath: '44/501/1/2/3',
    })
  })

  it('should throw an error for an invalid Ledger URL', () => {
    const url = 'invalid-url'
    expect(() => parseLedgerUrl(url)).toThrowError(
      'Invalid ledger url invalid-url. Expected url started with "usb://ledger"'
    )
  })
})
