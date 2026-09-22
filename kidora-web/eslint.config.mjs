// Flat config (ESLint 9+). `npm run lint` ran `next lint` with no config at
// all, so it dropped into an interactive setup prompt — which hangs forever
// in CI, and means this app has never actually been linted.
//
// The Next plugin ships its own flat configs, so this uses them directly
// rather than going through @eslint/eslintrc's compat layer, which cannot
// serialise the plugin's config object on this version.
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts', 'scripts/**'] },
  next.configs['core-web-vitals'],
  // Without this plugin registered, every `eslint-disable-next-line
  // react-hooks/exhaustive-deps` in the codebase is itself an error
  // ("rule not found") — and the dependency checks it silences never run.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    // jsx-a11y is registered because the codebase carries
    // `eslint-disable jsx-a11y/...` comments; without the plugin each one is
    // itself an error ("rule not found") and fails `next build`.
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    rules: {
      // Copy in this app uses ' and " freely; escaping every one would cost
      // more in readability than it buys.
      'react/no-unescaped-entities': 'off',
      // The API boundary is loosely typed in places; a warning keeps it
      // visible without failing the build.
      '@typescript-eslint/no-explicit-any': 'warn',
      // A warning, not an error: an unused import is worth seeing but is no
      // reason to fail a production build. `npm run lint` still reports them.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
    },
  },
);
