import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '.codebase-memory/**',
      '.scratch/**',
      // 产物目录：根 dist 与**子目录里的产物**（脚手架模板在仓库内构建时会生成
      // `create-yoya-ui/templates/<模板>/dist`，它们是压缩产物、不该进 lint）
      '**/dist/**',
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
    files: ['examples/demos/**/*.js'],
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
    // 形状矩阵基准的页面脚本：在真机浏览器里跑（`benchmark/shapes/bench.js`），
    // 与静态服务 / runner 分开——这里只认浏览器全局。
    files: ['benchmark/shapes/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      sourceType: 'module'
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
  },
  {
    // 形状矩阵 runner：主体是 Node，但 `page.evaluate(…)` 里的回调**在浏览器里执行**，
    // 所以这一支要同时认两边的全局。
    files: ['scripts/benchmark-shapes.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
];
