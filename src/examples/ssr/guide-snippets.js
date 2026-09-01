/**
 * 复制即用的最小 SSR 项目片段。
 * 开发者把这些文件复制到自己的工程即可搭建 SSR 项目。
 */

export const pageSnippet = `// home-page.js —— 页面即形态 A 组件，服务端与客户端共用
import { createRouter, div } from 'yoya-ui/ssr';

export const messages = {
  'zh-CN': { title: 'SSR 示例', home: '首页' },
  'en-US': { title: 'SSR Demo', home: 'Home' }
};

export function HomePage(state) {
  const router = createRouter();
  router.mode(state.mode || 'history');
  router.route('/home', '首页'.s('home'));
  router.notFound('未找到');
  router.renderPath(state.path || '/home'); // 服务端按请求路径渲染

  return div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.child(router);
  });
}`;

export const serverSnippet = `// server.mjs —— 服务端（node:http，无框架依赖）
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { renderPage } from 'yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

const DIST = join(import.meta.dirname, 'dist'); // npm run build 的产物
const MIME = { '.css': 'text/css', '.js': 'text/javascript' };

createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  // 静态资源：从 dist 目录按路径提供
  if (path !== '/') {
    const file = join(DIST, path.slice(1));
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
  }

  // lang 由你的服务端解析（cookie / query / 登录态都行）
  const lang = req.headers.cookie?.includes('yoya-lang=en') ? 'en' : 'zh-CN';

  const html = renderPage(
    {
      page: (page, state) => {
        page.head((head) => {
          head.title('SSR 示例'.s('title'));
          head.meta({ charset: 'utf-8' });
          head.link({ rel: 'stylesheet', href: '/yoya.ui.css' });
        });
        page.body((body) => {
          body.vBody((shell) => {
            shell.child(HomePage(state)); // state = { lang, path, mode }
          });
        });
      }
    },
    { lang, path, mode: 'history' }, // 状态唯一来源
    { messages }                    // 按 state.lang 建每请求 i18n，.s() 自动作用域
  );

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(3000);`;

export const clientSnippet = `// client.js —— 浏览器端（由打包器构建，与 yoya-ui/ssr 同一份模块实例）
import { hydrateOrMount } from 'yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

hydrateOrMount(HomePage, { messages });
// 自动读 __YOYA_DATA__ → #app 有服务端 HTML 走 hydrate（收养 DOM、绑事件），否则 mount`;

export const setupNotes = [
  'npm run build 生成 dist（yoya.ui.js / yoya.ssr.js / echarts.min.js 等），把 dist 挂载为静态目录',
  'echarts.min.js 用 script 标签全局引入，不要打进模块（避免 window.echarts 丢失）',
  'history 模式：服务端对未匹配路径返回首页；hash 模式：只输出首页即可',
  'client.js 用打包器构建，确保与 yoya-ui/ssr 解析到同一份模块，避免双副本失配',
  'render() 保持确定性、不读 document/window；超大页面用 maxNodes 回退',
  '低层原语 renderToString / hydrate / mount 仍可用，renderPage / hydrateOrMount 只是推荐封装'
];
