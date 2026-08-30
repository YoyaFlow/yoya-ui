import { section, vButton, vCard, vText } from '../index.js';
import { hydrate, mount, parseState, renderToString } from '../yoya.ssr.js';
import { echarts } from '../chart/echarts-loader.js';
import { ComponentSource } from './component-source.js';
import { clientSnippet, pageSnippet, serverSnippet, setupNotes } from './ssr/guide-snippets.js';
import { createSsrPage } from './ssr/page.js';

const createDemoPage = (state) => createSsrPage(state, { echartsLib: echarts });

const outputStyles = {
  background: 'var(--yoya-color-surface-hover, #f6f8fa)',
  border: '1px solid var(--yoya-color-border, #d8dee8)',
  borderRadius: '8px',
  boxSizing: 'border-box',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  maxHeight: '220px',
  overflow: 'auto',
  padding: '10px 12px',
  whiteSpace: 'pre-wrap',
  width: '100%'
};

function CopyButton(text) {
  const button = vButton('复制');
  button.size('small');
  button.variant('secondary');
  button.on('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.label('已复制');
      setTimeout(() => button.label('复制'), 1600);
    } catch {
      button.label('复制失败');
    }
  });
  return button;
}

function renderCopySnippet(parent, title, code) {
  parent.div((entry) => {
    entry.className('ssr-copy-snippet');
    entry.styles({ margin: '16px 0' });
    entry.div((header) => {
      header.className('ssr-copy-snippet-header');
      header.styles({
        alignItems: 'center',
        display: 'flex',
        gap: '8px',
        justifyContent: 'space-between'
      });
      header.h3(title);
      header.child(CopyButton(code));
    });
    entry.pre((pre) => {
      pre.className('ssr-demo-output');
      pre.styles(outputStyles);
      pre.code(code);
    });
  });
}

/**
 * SSR 交互演示：浏览器内调用 renderToString 生成服务端 HTML，
 * 展示产物与序列化状态，再注入容器并 hydrate；也可切换到非 SSR 模式直接 mount。
 * 两种模式使用同一份 createSsrPage 页面工厂。
 */
function SsrLiveDemo() {
  const hostId = 'ssr-live-host';
  const state = {
    locale: 'zh-CN',
    mode: 'history',
    path: '/home',
    renderMode: 'ssr'
  };
  const htmlText = vText('');
  const stateText = vText('');
  const modeText = vText('');
  let serverResult = null;

  const currentState = () => ({
    locale: state.locale,
    mode: state.mode,
    path: state.path
  });

  const renderServer = () => {
    serverResult = renderToString(createDemoPage, { state: currentState() });
    htmlText.textContent(serverResult.html);
    stateText.textContent(serverResult.state);
    modeText.textContent('当前模式：服务端渲染（renderToString → hydrate）');
  };

  const renderClient = () => {
    htmlText.textContent('非 SSR 模式：页面由 mount() 直接客户端渲染，不经过服务端。');
    stateText.textContent(JSON.stringify(currentState()));
    modeText.textContent('当前模式：纯客户端渲染（mount）');
  };

  const renderLive = () => {
    const host = document.getElementById(hostId);
    if (!host) {
      return;
    }

    if (state.renderMode === 'ssr') {
      host.innerHTML = serverResult.html;
      hydrate(createDemoPage, host, parseState(serverResult.state));
    } else {
      mount(createDemoPage, host, currentState());
    }
  };

  const sync = () => {
    if (state.renderMode === 'ssr') {
      renderServer();
    } else {
      renderClient();
    }
    renderLive();
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(sync);
  }

  const component = {
    render() {
      return vCard((card) => {
        card.vCardHeader('SSR 演示');
        card.vCardBody((body) => {
          body.div((controls) => {
            controls.className('ssr-demo-controls');
            controls.styles({ display: 'flex', flexWrap: 'wrap', gap: '8px' });
            controls.vButton('SSR 模式', (button) => {
              button.variant(state.renderMode === 'ssr' ? 'primary' : 'secondary');
              button.on('click', () => component.setRenderMode('ssr'));
            });
            controls.vButton('非 SSR 模式', (button) => {
              button.variant(state.renderMode === 'client' ? 'primary' : 'secondary');
              button.on('click', () => component.setRenderMode('client'));
            });
            controls.vButton('中文', (button) => {
              button.variant(state.locale === 'zh-CN' ? 'primary' : 'secondary');
              button.on('click', () => component.setLocale('zh-CN'));
            });
            controls.vButton('English', (button) => {
              button.variant(state.locale === 'en-US' ? 'primary' : 'secondary');
              button.on('click', () => component.setLocale('en-US'));
            });
            controls.vButton('首页路由', (button) => {
              button.variant(state.path === '/home' ? 'primary' : 'secondary');
              button.on('click', () => component.setPath('/home'));
            });
            controls.vButton('图表路由', (button) => {
              button.variant(state.path === '/chart' ? 'primary' : 'secondary');
              button.on('click', () => component.setPath('/chart'));
            });
          });

          body.p(modeText);
          body.h3('renderToString 输出的 HTML');
          body.pre((pre) => {
            pre.className('ssr-demo-output');
            pre.attr('data-ssr-live-output', 'true');
            pre.styles(outputStyles);
            pre.code(htmlText);
          });

          body.h3('序列化状态 __YOYA_DATA__');
          body.pre((pre) => {
            pre.className('ssr-demo-output');
            pre.attr('data-ssr-live-output', 'true');
            pre.styles(outputStyles);
            pre.code(stateText);
          });

          body.h3('Hydration 后的实时应用');
          body.div((host) => {
            host.id(hostId);
            host.className('ssr-live-host');
            host.styles({
              border: '1px solid var(--yoya-color-border, #d8dee8)',
              borderRadius: '8px',
              boxSizing: 'border-box',
              minHeight: '120px',
              overflow: 'auto',
              padding: '12px',
              width: '100%'
            });
            host.span('等待 hydration…');
          });
          body.p('填写邮箱可清除服务端烘焙的必填错误；点击导航链接切换路由。');
          body.p(
            '图表是局部客户端加载模块：服务端 HTML 只有占位 div，hydration 后浏览器加载并初始化柱状图。'
          );
        });
      });
    },
    setLocale(locale) {
      state.locale = locale;
      sync();
      return component;
    },
    setPath(path) {
      state.path = path;
      sync();
      return component;
    },
    setRenderMode(mode) {
      state.renderMode = mode === 'client' ? 'client' : 'ssr';
      sync();
      return component;
    }
  };

  return component;
}

export function SsrDocumentationPage() {
  const liveDemo = SsrLiveDemo();
  const sourcePanel = ComponentSource({
    component: createSsrPage,
    imports: [
      {
        from: 'yoya-ui',
        names: ['createI18n', 'createRouter', 'div', 'vForm', 'vFormItem', 'vInput', 'vLink']
      },
      { from: 'yoya-ui/echart', names: ['vEchart'] }
    ],
    sourceComponent: createSsrPage,
    title: 'createSsrPage 页面工厂源码'
  });

  return section((page) => {
    page.className('components-route-page components-ssr-page');
    page.attr('data-ssr-page', 'true');
    page.h1('服务端渲染');
    page.p(
      '服务端渲染（SSR）：服务端把声明式页面渲染成完整 HTML，浏览器端收养这份 HTML 并绑定事件。'
    );

    page.section((usage) => {
      usage.className('components-ssr-usage');
      usage.h2('核心 API');
      usage.ul((list) => {
        list.li(
          'renderToString(component, { state }) 输出 { html, state }；工厂创建的树序列化后自动销毁。'
        );
        list.li('hydrate(component, target, state) 收养服务端 DOM、回读表单快照并绑定事件。');
        list.li('serializeState / parseState 让状态可安全内联进 script 标签。');
        list.li('Router.renderPath(path) 在服务端按请求路径渲染匹配路由。');
      });
    });

    page.section((flow) => {
      flow.className('components-ssr-flow');
      flow.h2('工作流');
      flow.pre((pre) => {
        pre.styles(outputStyles);
        pre.code(
          '服务端：createSsrPage(requestState) → renderToString → HTML + __YOYA_DATA__\n客户端：parseState → createSsrPage(state) → hydrate("#app") → 事件可用'
        );
      });
    });

    page.section((guide) => {
      guide.className('components-ssr-copy');
      guide.attr('data-ssr-copy-guide', 'true');
      guide.h2('复制即用：最小 SSR 项目');
      guide.p(
        '以下三个文件构成最小 SSR 项目，复制到你的工程即可运行（先 npm run build 生成 dist）。'
      );

      renderCopySnippet(guide, 'page.js（页面工厂，两端共用）', pageSnippet);
      renderCopySnippet(guide, 'server.mjs（服务端入口）', serverSnippet);
      renderCopySnippet(guide, 'client.js（浏览器启动）', clientSnippet);

      guide.h3('运行与关键信息');
      guide.ul((list) => {
        setupNotes.forEach((note) => list.li(note));
      });
    });

    page.div((grid) => {
      grid.className('components-ssr-grid');
      grid.styles({ display: 'grid', gap: '16px', minWidth: '0' });
      grid.child(liveDemo);
      grid.child(sourcePanel);
    });
  });
}
