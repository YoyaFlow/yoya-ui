import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { renderPage } from '@yoyaflow/yoya-ui/ssr';
import { HomePage, messages } from './home-page.js';

const DIST = join(import.meta.dirname, '..', 'dist');
const MIME = { '.css': 'text/css', '.js': 'text/javascript' };
const PORT = Number(process.env.PORT || 3000);

createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;

  // 静态资源：client.js 与 assets/yoya.ui.css 由 npm run build 产出
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
          head.link({ rel: 'stylesheet', href: '/assets/yoya.ui.css' });
        });
        page.body((body) => {
          body.vBody((shell) => {
            shell.h1('SSR 示例'.s('title'));
            shell.child(HomePage(state)); // state = { lang, path, mode }
          });
        });
      }
    },
    { lang, mode: 'history', path },
    { messages } // 按 state.lang 建每请求 i18n，.s() 自动作用域
  );

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(PORT, () => console.log(`SSR server: http://localhost:${PORT}`));
