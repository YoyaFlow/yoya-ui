import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'YoyaUI',
      formats: ['es', 'umd'],
      fileName: (format) => `yoya-ui.${format}.js`
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js', 'examples/**/*.test.js']
  }
});
