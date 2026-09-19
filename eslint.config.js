import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '.codebase-memory/**',
      '.scratch/**',
      'dist/**',
      'node_modules/**',
      'src/chart/echarts.min.js',
      'src/core/signals/vendor/**'
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
    // 构建期编译器只在 Node 里跑（读文件、走 CLI），不是浏览器代码。
    files: ['src/compiler/**/*.js', 'src/yoya.compiler.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
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
    files: ['create-yoya-ui/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['eslint.config.js', 'vite.config.js', 'vite.examples.config.js'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: globals.node
    }
  }
];
