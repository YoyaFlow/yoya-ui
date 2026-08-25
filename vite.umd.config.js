import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/yoya.ui.js',
      name: 'YoyaUI',
      formats: ['umd'],
      fileName: () => 'yoya-ui.umd.js'
    }
  }
});
