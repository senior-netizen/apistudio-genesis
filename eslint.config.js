import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'node_modules',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/.vite/**',
      'apps/web/dist/**',
      'apps/vscode/dist/**',
      'apps/web/src/vendor/**',
      'squirrel/frontend/src/vendor/**'
    ]
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: [
      'node_modules',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/.vite/**',
      'apps/web/dist/**',
      'apps/vscode/dist/**',
      'apps/web/src/vendor/**',
      'squirrel/frontend/src/vendor/**'
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^(?:_|get)',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      '@typescript-eslint/no-redeclare': [
        'error',
        {
          ignoreDeclarationMerge: true
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
