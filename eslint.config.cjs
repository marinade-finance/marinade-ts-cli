const createSharedConfig = require('@marinade.finance/eslint-config')

const sharedConfig = createSharedConfig({})

module.exports = [
  ...sharedConfig,
  {
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'no-await-in-loop': 'off',
    },
  },
]
