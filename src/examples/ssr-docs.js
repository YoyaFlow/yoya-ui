import { section, vButton, vCard, vText } from '../index.js';
import { hydrate, mount, parseState, renderToString } from '../yoya.ssr.js';
import { echarts } from '../chart/echarts-loader.js';
import { ComponentSource } from './component-source.js';
import {
  clientSnippet,
  pageSnippet,
  serverSnippet,
  setupNotes,
  shellSnippet
} from './ssr/guide-snippets.js';
import { createLocale, createSsrPage } from './ssr/page.js';

const createDemoPage = (state) => createSsrPage(state, { echartsLib: echarts });

/** SSR 要避免的操作：避免项 / 应该怎么做 / 原因。 */
const ssrPitfalls = [
  [
    '在 render() / toHTML() 里读 document / window',
    '只在事件回调或 renderDom() 里访问 DOM，浏览器 API 加 typeof 守卫',
    '服务端没有 DOM，渲染路径必须 DOM-free'
  ],
  [
    '用 Date.now() / Math.random() 影响输出（含 key、id）',
    '结构只依赖请求输入；id 用 allocateId 由渲染上下文分配',
    '两端产出的树不一致会导致 hydrate 错位'
  ],
  [
    '组件里直接 document.addEventListener / window.addEventListener',
    'bindDocumentEvent / bindWindowEvent，destroy 时执行返回的 unbind',
    '服务端无 DOM；客户端要能随节点销毁解绑'
  ],
  [
    '把请求相关状态、视图树或组件实例放模块级（当前用户、语言、计数器、区域节点、组件实例）',
    '每请求创建 createAccess / createI18n / withContext，区域节点与组件实例在页面工厂内创建',
    '模块级状态与视图树会在并发请求之间串数据、复用同一棵树'
  ],
  [
    '在服务端渲染期间调用 rebuild() / flush()',
    '首屏只做构建（绑定在构建期写回），重建与刷新留给客户端交互',
    '物化 DOM 需要浏览器环境，服务端调用没有意义'
  ],
  [
    '在渲染期间发请求、埋点或设定时器',
    '副作用移到事件回调或客户端挂载之后',
    'SSR 只负责输出，渲染结果可能被缓存或重放'
  ],
  [
    '用 getBoundingClientRect / offsetWidth 决定结构',
    '结构由状态决定，测量只用于渲染后的定位逻辑',
    '服务端没有布局，测量结果会让两端不一致'
  ],
  [
    '把函数放进请求状态传给 renderPage',
    '只传可序列化数据（路径、筛选条件、locale）',
    '状态要序列化进 __YOYA_DATA__ 并在客户端解析'
  ],
  [
    '假设客户端会重建服务端 DOM',
    'hydrate() 收养既有 DOM、只补事件适配器',
    '重建会闪烁首屏并丢掉服务端已渲染的状态'
  ]
];

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
    serverResult = renderToString(createDemoPage, {
      state: currentState(),
      i18n: createLocale
    });
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
      hydrate(createDemoPage, host, parseState(serverResult.state), { i18n: createLocale });
    } else {
      mount(createDemoPage, host, currentState(), { i18n: createLocale });
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
        from: '@yoyaflow/yoya-ui',
        names: ['createRouter', 'div', 'vForm', 'vFormItem', 'vInput', 'vLink', 'vClientOnly']
      },
      { from: '@yoyaflow/yoya-ui/echart', names: ['vEchart'] }
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
    page.a((entry) => {
      entry.attr({
        'data-ssr-standalone-link': 'true',
        href: './ssr-demo.html',
        rel: 'noopener',
        target: '_blank'
      });
      entry.className('ssr-standalone-entry');
      entry.styles({
        background: 'var(--yoya-color-primary, #2563eb)',
        borderRadius: '8px',
        color: '#ffffff',
        display: 'inline-block',
        fontSize: '14px',
        fontWeight: '600',
        margin: '4px 0 12px',
        padding: '8px 14px',
        textDecoration: 'none'
      });
      entry.text('打开独立演示页面（新标签页）');
    });

    page.section((usage) => {
      usage.className('components-ssr-usage');
      usage.h2('核心 API');
      usage.ul((list) => {
        list.li(
          'renderPage({ page }, state, { messages }) 输出文档骨架：head/body 用 DSL 定义、状态只传一次；客户端入口由你在 head 里自己引入（renderPage 不输出脚本）。'
        );
        list.li(
          'hydrateOrMount(component, { messages }) 客户端一行接入：自动读状态并选择 hydrate 或 mount。'
        );
        list.li(
          'renderToString / hydrate / mount 为底层原语，需要细粒度控制时使用；serializeState / parseState 安全内联状态。'
        );
        list.li('Router.renderPath(path) 在服务端按请求路径渲染匹配路由。');
      });
    });

    page.section((flow) => {
      flow.className('components-ssr-flow');
      flow.h2('工作流');
      flow.pre((pre) => {
        pre.styles(outputStyles);
        pre.code(
          '服务端：renderPage({ page }, { lang, path }, { messages }) → 完整 HTML + __YOYA_DATA__\n客户端：hydrateOrMount(HomePage, { messages }) → 收养 DOM、绑定事件'
        );
      });
    });

    page.section((rules) => {
      rules.className('components-ssr-rules');
      rules.attr('data-ssr-rules', 'true');
      rules.h2('要避免的操作');
      rules.p('SSR 纪律可以归纳成一句：渲染路径必须 DOM-free 且确定性，请求数据一律按请求注入。');
      rules.table((table) => {
        table.className('components-ssr-rules-table');
        table.thead((head) => {
          head.tr((row) => {
            row.th('避免');
            row.th('应该');
            row.th('原因');
          });
        });
        table.tbody((body) => {
          ssrPitfalls.forEach(([avoid, instead, reason]) => {
            body.tr((row) => {
              row.td(avoid);
              row.td(instead);
              row.td(reason);
            });
          });
        });
      });
    });

    page.section((guide) => {
      guide.className('components-ssr-copy');
      guide.attr('data-ssr-copy-guide', 'true');
      guide.h2('复制即用：最小 SSR 项目');
      guide.p(
        '以下三个文件构成最小 SSR 项目，复制到你的工程即可运行（先 npm run build 生成 dist）。'
      );

      renderCopySnippet(guide, 'home-page.js（页面组件，两端共用）', pageSnippet);
      renderCopySnippet(guide, 'server.mjs（服务端入口）', serverSnippet);
      renderCopySnippet(guide, '服务端渲染出来的 HTML（客户端入口在第 ③ 行引入）', shellSnippet);
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
