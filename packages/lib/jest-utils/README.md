# jest-utils

[`@marinade.finance/jest-utils`](https://www.npmjs.com/package/@marinade.finance/jest-utils)

Jest testing utilities.

For global equality tester it can be added to check `BN` and `@solana/web3.js` `PublicKey`
and when using [`jest-shell-matchers`](https://www.npmjs.com/package/jest-shell-matchers)
then adding TypeScript typing for it.

## Configuration of the equality tester for global usage

Add to `jest.config.js` something like this

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 90000,
  detectOpenHandles: true,
  modulePathIgnorePatterns: ['<rootDir>/build/'],
  testPathIgnorePatterns: ['__tests__/.*.skip.ts', '__tests__/setup/*'],
  globalSetup:
    '<rootDir>/packages/marinade-ts-cli/__tests__/setup/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/packages/jest-utils/src/equalityTesters.ts'],
}
```
