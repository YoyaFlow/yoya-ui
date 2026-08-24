import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/examples',
  base: './',
  build: {
    emptyOutDir: true,
    outDir: '../../dist/examples',
    rollupOptions: {
      external: ['yoya-ui/ui'],
      input: 'Index.html',
      output: {
        paths: {
          'yoya-ui/ui': '../yoya.ui.js'
        }
      }
    }
  },
  resolve: {
    alias: [
      { find: /^(?:\.\.\/)+index\.js$/, replacement: 'yoya-ui/ui' },
      { find: /^(?:\.\.\/)+src\/index\.js$/, replacement: 'yoya-ui/ui' }
    ]
  }
});
