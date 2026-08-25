import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/examples',
  base: './',
  build: {
    emptyOutDir: true,
    outDir: '../../dist/examples',
    rollupOptions: {
      external: ['yoya-ui/ui'],
      input: {
        anchor: 'anchor.html',
        index: 'Index.html',
        'declarative-router': 'declarative-router.html',
        'router-links': 'router-links.html',
        'router-views': 'router-views.html',
        'router-views-top': 'router-views-top.html'
      },
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
