/** @type {import('ts-jest').JestConfigWithTsJest} */

// we can define here only configuration that belongs to both test types,
// to unit tests (src/**/*.spec.ts) and integration tests (test/**/*.spec.ts)

module.exports = {
  preset: 'ts-jest',
  testTimeout: 90000,
  globalSetup: '<rootDir>/packages/marinade-ts-cli/__tests__/setup/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/packages/jest-utils/src/equalityTesters.ts'],
}
