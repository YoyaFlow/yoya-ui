import { afterEach, describe, expect, it } from 'vitest';
import { createRouter, div, vText } from './index.js';
import { hydrateOrMount, renderPage, serializeState } from './yoya.ssr.js';

const messages = {
  'zh-CN': { title: 'SSR 示例', home: '首页', greeting: '你好，{name}！' },
  'en-US': { title: 'SSR Demo', home: 'Home', greeting: 'Hello, {name}!' }
};

function HomePage(state) {
  const router = createRouter();
  router.mode(state.mode || 'history');
  router.route('/home', '首页'.s('home'));
  router.renderPath(state.path || '/home');

  return div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.p('你好，{name}！'.s('greeting', { name: state.name || 'yoya-ui' }));
    root.child(router);
  });
}

describe('renderPage', () => {
  it('renders a complete HTML document with DSL head and body', () => {
    const html = renderPage(
      {
        page: (page, state) => {
          page.head((head) => {
            head.title('SSR 示例'.s('title'));
            head.meta({ charset: 'utf-8' });
            head.link({ rel: 'stylesheet', href: '/yoya.ui.css' });
          });
          page.body((body) => {
            body.vBody((shell) => shell.child(HomePage(state)));
          });
        }
      },
      { lang: 'en-US', mode: 'history', name: 'Ada', path: '/home' },
      { messages }
    );

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<html lang="en-US">');
    expect(html).toContain('<title>SSR Demo</title>');
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain('href="/yoya.ui.css"');
    expect(html).toContain('id="app"');
    expect(html).toContain('Hello, Ada!');
    expect(html).toContain('id="__YOYA_DATA__"');
    expect(html).toContain('"lang":"en-US"');
    expect(html).toContain('<script type="module" src="/client.js"></script>');
  });

  it('passes the normalized state into head/body callbacks', () => {
    const html = renderPage(
      {
        page: (page) => {
          page.body((body, bodyState) => body.p(`name=${bodyState.name}`));
        }
      },
      { lang: 'zh-CN', name: 'yoya-ui' },
      { messages }
    );

    expect(html).toContain('name=yoya-ui');
  });

  it('supports page.vBody as a shortcut for the body shell', () => {
    const html = renderPage(
      {
        page: (page) => {
          page.vBody((shell) => shell.p('内容'));
        }
      },
      { lang: 'zh-CN' },
      { messages }
    );

    expect(html).toContain('yoya-vbody');
    expect(html).toContain('内容');
  });

  it('uses a custom state id', () => {
    const html = renderPage(
      { page: (page) => page.body((body) => body.p('x')) },
      { lang: 'zh-CN' },
      { messages, stateId: 'yoya-data-page' }
    );

    expect(html).toContain('id="yoya-data-page"');
  });

  it('returns an empty app container when the page exceeds maxNodes', () => {
    const html = renderPage(
      { page: (page) => page.body((body) => body.p('太多节点')) },
      { lang: 'zh-CN' },
      { maxNodes: 1 }
    );

    expect(html).toContain('<div id="app"></div>');
    expect(html).not.toContain('太多节点');
    expect(html).toContain('id="__YOYA_DATA__"');
  });
});

describe('hydrateOrMount', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function InteractivePage() {
    const message = vText('初始');
    return div((root) => {
      root.vButton('点击', (button) => {
        button.on('click', () => message.textContent('已点击'));
      });
      root.child(message);
    });
  }

  it('hydrates server-rendered HTML and binds events', () => {
    const html = renderPage(
      { page: (page) => page.body((body) => body.child(InteractivePage())) },
      { lang: 'zh-CN' },
      { messages }
    );
    const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
    const stateMatch = html.match(
      /<script type="application\/json" id="__YOYA_DATA__">([\s\S]*?)<\/script>/
    );
    document.body.innerHTML = bodyMatch[1];
    const stateScript = document.createElement('script');
    stateScript.id = '__YOYA_DATA__';
    stateScript.type = 'application/json';
    stateScript.textContent = stateMatch[1];
    document.body.appendChild(stateScript);

    hydrateOrMount(InteractivePage, { messages });

    const button = document.querySelector('button');
    button.click();
    expect(document.body.textContent).toContain('已点击');
  });

  it('mounts when there is no server-rendered HTML', () => {
    document.body.innerHTML =
      '<div id="app"></div>' +
      `<script id="__YOYA_DATA__" type="application/json">${serializeState({ lang: 'zh-CN' })}</script>`;

    hydrateOrMount(InteractivePage, { messages });

    const button = document.querySelector('button');
    button.click();
    expect(document.body.textContent).toContain('已点击');
  });

  it('reads a custom state id and target', () => {
    document.body.innerHTML =
      '<div id="stats"></div>' +
      `<script id="yoya-data-stats" type="application/json">${serializeState({ lang: 'zh-CN' })}</script>`;

    hydrateOrMount(InteractivePage, { messages, stateId: 'yoya-data-stats', target: '#stats' });

    expect(document.querySelector('#stats button')).not.toBeNull();
  });
});
