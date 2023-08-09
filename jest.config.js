/** @type {import('ts-jest').JestConfigWithTsJest} */

// we can define here only configuration that belongs to both test types,
// to unit tests (src/**/*.spec.ts) and integration tests (test/**/*.spec.ts)

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 90000,
  detectOpenHandles: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['__tests__/.*.skip.ts', '__tests__/setup/*'],
  globalSetup:
    '<rootDir>/packages/marinade-ts-cli/__tests__/setup/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/packages/jest-utils/src/equalityTesters.ts'],
}
