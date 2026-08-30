import { createSsrPage } from './page.js';
import { renderToString } from '../../yoya.ssr.js';

const initial = {
  locale: globalThis.process.env.SSR_LOCALE || 'zh-CN',
  path: globalThis.process.env.SSR_PATH || '/home'
};
const { html, state } = renderToString(createSsrPage, { state: initial });

const document = `<!doctype html>
<html lang="${initial.locale}">
  <head>
    <meta charset="utf-8" />
    <title>yoya-ui SSR 示例</title>
    <link rel="stylesheet" href="/yoya.ui.css" />
  </head>
  <body>
    <div id="app">${html}</div>
    <script type="application/json" id="__YOYA_DATA__">${state}</script>
    <script type="module">
      import { hydrate } from '/yoya.ssr.js';
      import { createSsrPage } from '/examples/ssr/page.js';
      const data = JSON.parse(document.getElementById('__YOYA_DATA__').textContent);
      hydrate(createSsrPage, '#app', data);
    </script>
  </body>
</html>`;

globalThis.process.stdout.write(document);
