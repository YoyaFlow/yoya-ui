import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '.codebase-memory/**',
      '.scratch/**',
      'dist/**',
      'node_modules/**',
      'src/chart/echarts.min.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'examples/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['src/examples/demos/**/*.js'],
    rules: {
      'max-len': ['error', { code: 100, ignoreUrls: true }]
    }
  },
  {
    files: ['**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest
      }
    }
  },
  {
    files: ['eslint.config.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node
    }
  }
];
