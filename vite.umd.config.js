import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/yoya.ui-router.js',
      name: 'YoyaUI',
      formats: ['umd'],
      fileName: () => 'yoya.ui-router.umd.js'
    }
  }
});
