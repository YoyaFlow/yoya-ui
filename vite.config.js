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
        'packages/yoya-core/src/core/signals/vendor/**'
      ]
    }
  }
});
