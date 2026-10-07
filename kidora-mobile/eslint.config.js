// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    rules: {
      'no-console': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Every network call must go through services/api.ts.
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use the services layer (services/api.ts).' }],
    },
  },
]);
