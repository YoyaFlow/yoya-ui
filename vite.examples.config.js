import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const echartsSource = fileURLToPath(new URL('./src/chart/echarts.min.js', import.meta.url));

const injectEchartsScript = {
  name: 'yoya-examples-inject-echarts',
  transformIndexHtml(html, ctx) {
    const filename = String(ctx.filename || '').toLowerCase();
    if (!filename.endsWith('index.html')) {
      return html;
    }

    // dev 下 root 是 src/examples，echarts 文件在 root 之外，用 /@fs/ 绝对路径提供
    const src = ctx.server ? `/@fs/${echartsSource.replace(/\\/g, '/')}` : './echarts.min.js';
    return html.replace('</head>', `    <script src="${src}"></script>\n  </head>`);
  },
  closeBundle() {
    cpSync(echartsSource, 'dist/examples/echarts.min.js');
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
        'grid-responsive': 'grid-responsive.html',
        index: 'Index.html',
        'ssr-demo': 'ssr-demo.html',
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
