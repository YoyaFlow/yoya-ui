import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createSsrPage } from './page.js';
import { renderToString, serializeState } from '../../yoya.ssr.js';

const PORT = Number(globalThis.process.env.SSR_PORT || 3000);
const DIST = join(import.meta.dirname, '../../../dist');
const MAX_NODES = 5000;

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const clientBoot = `import { hydrate, mount, parseState } from '/vendor/yoya.ssr.js';
import { vEchart } from '/vendor/yoya.echart.js';

const {
  createI18n,
  createRouter,
  div,
  vClientOnly,
  vForm,
  vFormItem,
  vInput,
  vLink
} = window.YoyaUI;

// 无打包的最小演示：客户端页面工厂与服务端保持一致。
// 实际项目请把 page.js 通过打包器同时供两端使用，避免重复维护。
const messages = {
  'zh-CN': { chart: '图表', chartPage: '图表页', email: '邮箱', title: 'SSR 示例', welcome: '欢迎使用服务端渲染' },
  'en-US': { chart: 'Chart', chartPage: 'Chart Page', email: 'Email', title: 'SSR Demo', welcome: 'Welcome to SSR' }
};
const chartOption = {
  xAxis: { data: ['A', 'B', 'C'], type: 'category' },
  yAxis: { type: 'value' },
  series: [{ data: [1, 3, 2], type: 'bar' }]
};

function createPage(initial = {}) {
  const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
  const router = createRouter();
  router.mode(initial.mode || 'hash');
  router.route('/home', locale.t('welcome'));
  router.route('/chart', locale.t('chartPage'));
  router.notFound('未找到');

  const form = vForm();
  const emailItem = vFormItem({ label: locale.t('email'), name: 'email', required: true });
  emailItem.control(vInput({ name: 'email', placeholder: locale.t('email') }));
  form.child(emailItem);
  form.validate();

  const page = div((root) => {
    root.h1(locale.t('title'));
    root.nav((nav) => {
      nav.child(vLink(router, { label: locale.t('welcome'), to: '/home' }));
      nav.child(vLink(router, { label: locale.t('chart'), to: '/chart' }));
    });
    root.child(router);
    root.child(form);
    root.child(
      vClientOnly(() =>
        vEchart({
          echartsLib: typeof window !== 'undefined' ? window.echarts : undefined,
          option: chartOption,
          renderer: 'svg'
        })
      )
    );
  });

  router.renderPath(initial.path || '/home');
  return page;
}

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  hydrate(createPage, app, data);
} else {
  mount(createPage, app, data);
}
`;

function buildShell(initial, html, state) {
  return `<!doctype html>
<html lang="${initial.locale}">
  <head>
    <meta charset="utf-8" />
    <title>yoya-ui SSR 示例</title>
    <link rel="stylesheet" href="/vendor/yoya.ui.css" />
    <script src="/vendor/echarts.min.js"></script>
  </head>
  <body>
    <div id="app">${html}</div>
    <script type="application/json" id="__YOYA_DATA__">${state}</script>
    <script type="module" src="/client.js"></script>
  </body>
</html>`;
}

function renderPage(initial) {
  const { exceeded, html, state } = renderToString(createSsrPage, {
    maxNodes: MAX_NODES,
    state: initial
  });

  if (exceeded) {
    return buildShell(initial, '', serializeState(initial));
  }

  return buildShell(initial, html, state);
}

function serveFile(res, relativePath) {
  const filePath = join(DIST, relativePath);
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

if (!existsSync(join(DIST, 'yoya.ui.js'))) {
  throw new Error('dist 产物缺失，请先运行 npm run build');
}

const server = createServer((req, res) => {
  const url = new globalThis.URL(req.url, 'http://localhost');

  if (url.pathname === '/client.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    res.end(clientBoot);
    return;
  }

  if (url.pathname.startsWith('/vendor/')) {
    serveFile(res, url.pathname.slice('/vendor/'.length));
    return;
  }

  const locale = url.searchParams.get('locale') || 'zh-CN';
  const initial = {
    locale,
    mode: 'history',
    path: url.pathname || '/'
  };

  res.writeHead(200, { 'Content-Type': MIME['.html'] });
  res.end(renderPage(initial));
});

server.listen(PORT, () => {
  globalThis.console.log(`SSR 示例服务已启动：http://localhost:${PORT}/`);
  globalThis.console.log('先运行 npm run build 生成 dist 产物');
});
