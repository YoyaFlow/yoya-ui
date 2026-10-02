import { defineConfig } from 'vite';
import { workspaceSourcePlugin } from './scripts/vite-workspace-plugin.mjs';

export default defineConfig({
  plugins: [workspaceSourcePlugin()],
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'packages/yoya-ui/src/index.js',
      name: 'YoyaUI',
      formats: ['es'],
      fileName: () => 'yoya.ui.js'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // 编译器那批用例单文件就要 5–19s（真编译 + 逐字节对比），默认 5s 在并行负载下会成片
    // 报 "Test timed out"，红的是超时不是断言。放宽到 20s：既盖住真实耗时，又仍能兜住死循环。
    hookTimeout: 20000,
    testTimeout: 20000,
    include: [
      'packages/*/src/**/*.test.js',
      'packages/*/tests/**/*.test.js',
      'packages/*/test/**/*.test.js',
      'examples/**/*.test.js'
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/create-yoya-ui/templates/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.js'],
      exclude: [
        'examples/**',
        '**/*.test.js',
        '**/*.min.js',
        'packages/*/src/testing/**',
        'packages/yoya-core/src/core/signals/vendor/**'
      ]
    }
  }
});
