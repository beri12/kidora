// Flat config (ESLint 9+). `npm run lint` failed outright before this file
// existed: the script was written for the old .eslintrc format, which was
// never committed, so linting has never actually run on this codebase.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'prisma/migrations/**', 'scripts/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        Express: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      // This codebase leans on `any` at the Nest/Express boundary (request
      // objects, multer callbacks). Flagging every one would bury real
      // findings, so it warns rather than fails.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          // `const { passwordHash, ...safe } = user` is how this codebase
          // strips secrets before returning a row. The discarded names are
          // unused by definition; that is the point of the pattern.
          ignoreRestSiblings: true,
        },
      ],
      // Optional deps (twilio, @aws-sdk/client-s3) are loaded lazily with
      // require() on purpose, so they stay optional.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Tests describe shapes loosely on purpose.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly',
        beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
