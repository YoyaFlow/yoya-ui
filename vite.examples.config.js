import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

const injectEchartsScript = {
  name: 'yoya-examples-inject-echarts',
  transformIndexHtml(html, ctx) {
    const filename = String(ctx.filename || '').toLowerCase();
    if (!filename.endsWith('index.html')) {
      return html;
    }

    const src = ctx.server ? '/src/chart/echarts.min.js' : './echarts.min.js';
    return html.replace('</head>', `    <script src="${src}"></script>\n  </head>`);
  },
  closeBundle() {
    cpSync('src/chart/echarts.min.js', 'dist/examples/echarts.min.js');
  }
};

export default defineConfig({
  root: 'src/examples',
  base: './',
  build: {
    emptyOutDir: true,
    minify: false,
    outDir: '../../dist/examples',
    rollupOptions: {
      input: {
        anchor: 'anchor.html',
        index: 'Index.html',
        'declarative-router': 'declarative-router.html',
        'router-async': 'router-async.html',
        'router-history': 'router-history.html',
        'router-links': 'router-links.html',
        'router-params': 'router-params.html',
        'router-views': 'router-views.html',
        'router-views-top': 'router-views-top.html'
      }
    }
  },
  plugins: [injectEchartsScript]
});
