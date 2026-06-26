/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 90000,
  detectOpenHandles: true,
  modulePathIgnorePatterns: ['dist/'],
  testPathIgnorePatterns: ['__tests__/.*.skip.ts', '__tests__/setup/*'],
  globalSetup:
    '<rootDir>/packages/marinade-ts-cli/__tests__/setup/globalSetup.ts',
  setupFilesAfterEnv: [
    '<rootDir>/packages/marinade-ts-cli/node_modules/@marinade.finance/marinade-ts-sdk/dist/test/setup/equalityTesters',
  ],
}
