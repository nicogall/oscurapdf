import globals from 'globals';
import tseslint from 'typescript-eslint';
import { localPlugin } from './tools/eslint-rules/max-public-methods.js';

/** Constitution VII limits (CI-blocking). */
const cleanCodeRules = {
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
  'max-params': ['error', 4],
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'no-console': 'error',
  'local/max-public-methods': ['error', 10],
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'dist-e2e-fault/',
      'build/',
      'coverage/',
      'public/',
      'test-results/',
      'playwright-report/',
      '*.min.js',
      '.specify/',
      '.claude/',
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { local: localPlugin },
    rules: {
      ...cleanCodeRules,
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/app/infrastructure/console-logger.ts', 'tools/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Test files: `describe` callbacks legitimately group many cases.
    files: ['tests/**', '**/*.test.{ts,tsx,js}'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
