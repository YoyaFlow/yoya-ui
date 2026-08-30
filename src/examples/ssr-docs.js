import { section, vCard, vText } from '../index.js';
import { hydrate, parseState, renderToString } from '../yoya.ssr.js';
import { ComponentSource } from './component-source.js';
import { createSsrPage } from './ssr/page.js';

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

/**
 * SSR 交互演示：浏览器内调用 renderToString 生成服务端 HTML，
 * 展示产物与序列化状态，再注入容器并 hydrate，演示事件接管。
 */
function SsrLiveDemo() {
  const hostId = 'ssr-live-host';
  const state = {
    locale: 'zh-CN',
    mode: 'history',
    path: '/home'
  };
  const htmlText = vText('');
  const stateText = vText('');
  let serverResult = null;

  const renderServer = () => {
    serverResult = renderToString(createSsrPage, { state: { ...state } });
    htmlText.textContent(serverResult.html);
    stateText.textContent(serverResult.state);
  };

  const hydrateLive = () => {
    const host = document.getElementById(hostId);
    if (!host || !serverResult) {
      return;
    }

    host.innerHTML = serverResult.html;
    hydrate(createSsrPage, host, parseState(serverResult.state));
  };

  renderServer();

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(hydrateLive);
  }

  const component = {
    render() {
      return vCard((card) => {
        card.vCardHeader('SSR 演示');
        card.vCardBody((body) => {
          body.div((controls) => {
            controls.className('ssr-demo-controls');
            controls.styles({ display: 'flex', flexWrap: 'wrap', gap: '8px' });
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

          body.h3('renderToString 输出的 HTML');
          body.pre((pre) => {
            pre.className('ssr-demo-output');
            pre.styles(outputStyles);
            pre.code(htmlText);
          });

          body.h3('序列化状态 __YOYA_DATA__');
          body.pre((pre) => {
            pre.className('ssr-demo-output');
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
        });
      });
    },
    setLocale(locale) {
      state.locale = locale;
      renderServer();
      hydrateLive();
      return component;
    },
    setPath(path) {
      state.path = path;
      renderServer();
      hydrateLive();
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

    page.div((grid) => {
      grid.className('components-ssr-grid');
      grid.styles({ display: 'grid', gap: '16px', minWidth: '0' });
      grid.child(liveDemo);
      grid.child(sourcePanel);
    });
  });
}
