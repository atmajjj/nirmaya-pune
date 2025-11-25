import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['build/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/tests/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
