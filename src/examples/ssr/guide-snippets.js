/**
 * 复制即用的最小 SSR 项目片段。
 * 开发者把这些文件复制到自己的工程即可搭建 SSR 项目。
 */

export const pageSnippet = `// page.js —— 服务端与客户端共用同一份页面工厂
import {
  createI18n,
  createRouter,
  div,
  vClientOnly,
  vForm,
  vFormItem,
  vInput,
  vLink
} from 'yoya-ui';
import { vEchart } from 'yoya-ui/echart';

const messages = {
  'zh-CN': { title: 'SSR 示例', welcome: '欢迎', email: '邮箱' },
  'en-US': { title: 'SSR Demo', welcome: 'Welcome', email: 'Email' }
};

export function createSsrPage(initial = {}) {
  const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
  const router = createRouter();
  router.mode(initial.mode || 'hash');
  router.route('/home', locale.t('welcome'));
  router.notFound('未找到');
  router.renderPath(initial.path || '/home'); // 服务端按请求路径渲染

  const form = vForm();
  const email = vFormItem({ label: locale.t('email'), name: 'email', required: true });
  email.control(vInput({ name: 'email' }));
  form.child(email);
  form.validate(); // 错误状态烘焙进服务端 HTML，客户端同规则校验

  return div((root) => {
    root.h1(locale.t('title'));
    root.child(router);
    root.child(form);
    // 非 SSR 模块（如 ECharts）：服务端只出占位，客户端加载
    root.child(vClientOnly(() => vEchart({ option: { series: [] } })));
  });
}`;

export const serverSnippet = `// server.mjs —— 服务端（node:http，无框架依赖）
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { renderToString, serializeState } from 'yoya-ui/ssr';
import { createSsrPage } from './page.js';

const DIST = join(import.meta.dirname, 'dist'); // npm run build 的产物
const MIME = { '.css': 'text/css', '.js': 'text/javascript' };

const shell = (initial, html, state) => \`<!doctype html>
<html lang="\${initial.locale}">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="/yoya.ui.css" />
  <script src="/echarts.min.js"></script>
</head>
<body>
  <div id="app">\${html}</div>
  <script type="application/json" id="__YOYA_DATA__">\${state}</script>
  <script type="module" src="/client.js"></script>
</body>
</html>\`;

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // 静态资源：从 dist 目录按路径提供
  if (url.pathname !== '/') {
    const file = join(DIST, url.pathname.slice(1));
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
  }

  const initial = {
    locale: url.searchParams.get('locale') || 'zh-CN',
    mode: 'history',
    path: url.pathname
  };
  const { html, state, exceeded } = renderToString(createSsrPage, { state: initial });

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(shell(initial, exceeded ? '' : html, serializeState(initial)));
}).listen(3000);`;

export const clientSnippet = `// client.js —— 浏览器端（由打包器构建，与 yoya-ui/ssr 同一份模块实例）
import { hydrate, mount, parseState } from 'yoya-ui/ssr';
import { createSsrPage } from './page.js';

const data = parseState(document.getElementById('__YOYA_DATA__').textContent);
const app = document.getElementById('app');

if (app.firstElementChild) {
  hydrate(createSsrPage, app, data); // 有服务端 HTML：收养 DOM、绑定事件
} else {
  mount(createSsrPage, app, data); // 空壳：全量客户端渲染
}`;

export const setupNotes = [
  'npm run build 生成 dist（yoya.ui.js / yoya.ssr.js / echarts.min.js 等），把 dist 挂载为静态目录',
  'echarts.min.js 用 script 标签全局引入，不要打进模块（避免 window.echarts 丢失）',
  'history 模式：服务端对未匹配路径返回首页；hash 模式：只输出首页即可',
  'client.js 用打包器构建，确保与 yoya-ui/ssr 解析到同一份模块，避免双副本失配',
  'render() 保持确定性、不读 document/window；超大页面用 maxNodes 回退'
];
