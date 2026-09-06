import { div, section, vCard, vDynamicLoader, vText, vstack } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  CardExample1,
  CodeExample1,
  DropdownMenuExample1,
  DynamicLoaderExample1,
  MessageManagerExample1,
  PaginationExample1
} from './detail-sources.js';

function DynamicLoaderLiveDemo() {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let attempts = 0;
  let statusLine = null;

  const moduleLoader = vDynamicLoader({
    auto: false,
    cacheKey: 'audit-module-demo',
    loader: async () => {
      attempts += 1;
      const current = attempts;
      await wait(current === 1 ? 900 : 1400);
      if (current === 1) {
        throw new Error('模拟网络超时');
      }
      return { name: '审计模块', total: 128 };
    },
    onStateChange(state) {
      if (!statusLine) {
        return;
      }
      const labels = {
        error: '加载失败',
        loaded: '加载成功',
        loading: '加载中',
        pending: '等待'
      };
      statusLine.textContent(`${labels[state]}（第 ${attempts} 次请求）`);
    },
    views: {
      error: (error) =>
        div((box) => {
          box.styles({
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            color: '#dc2626',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText(`加载失败：${error.message}`));
          box.div((hint) => {
            hint.styles({ color: '#7f1d1d', fontWeight: '400', marginTop: '6px' });
            hint.child(vText('点击「重试」再次发起请求'));
          });
        }),
      loaded: (module) =>
        div((box) => {
          box.styles({
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            color: '#16a34a',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText(`${module.name} 已加载`));
          box.div((meta) => {
            meta.styles({ color: '#475569', fontWeight: '400', marginTop: '6px' });
            meta.child(vText(`共处理 ${module.total} 条记录，数据来自异步模块`));
          });
        }),
      loading: () =>
        div((box) => {
          box.styles({
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            color: '#1d4ed8',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText('正在请求审计模块…'));
        }),
      pending: () =>
        div((box) => {
          box.styles({
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            color: '#475569',
            fontWeight: '600',
            padding: '12px 16px'
          });
          box.child(vText('等待加载审计模块'));
        })
    }
  });

  return {
    render() {
      return vstack({ gap: '14px' }, (stack) => {
        stack.child(moduleLoader);
        stack.output((out) => {
          out.attr('data-loader-status-line', 'true');
          statusLine = vText('尚未开始');
          out.child(statusLine);
        });
        stack.hstack({ gap: '10px' }, (actions) => {
          actions.vButton('开始加载', (button) => {
            button.id('dynamic-load');
            button.on('click', () => moduleLoader.load().catch(() => {}));
          });
          actions.vButton('重试', (button) => {
            button.id('dynamic-retry');
            button.variant('secondary');
            button.on('click', () => moduleLoader.retry().catch(() => {}));
          });
          actions.vButton('再次加载', (button) => {
            button.id('dynamic-cache');
            button.variant('secondary');
            button.on('click', () => {
              if (moduleLoader.status() === 'loaded') {
                statusLine.textContent('缓存命中：直接返回已加载模块，不发起网络请求');
                return;
              }
              moduleLoader.load().catch(() => {});
            });
          });
        });
      });
    }
  };
}

const pageConfigs = Object.freeze([
  {
    component: DropdownMenuExample1,
    heading: '下拉菜单 vDropdownMenu',
    imports: ['vDropdownMenu', 'vText'],
    intro: '按钮触发的浮层菜单，支持键盘操作与连续点选。',
    key: 'dropdown',
    route: 'navigation:dropdown',
    title: '下拉菜单',
    usage: ['需要把多个动作收纳到浮层时。', '需要键盘可达的菜单入口时。'],
    apiRows: [
      ['vDropdownMenu((menu) => ...)', '创建下拉菜单。', 'vDropdownMenu((menu) => ...)'],
      ['menu.placement(value)', '设置浮层位置。', "menu.placement('bottom-end')"],
      ['menu.closeOnSelect(value)', '选择后是否保持展开。', 'menu.closeOnSelect(false)']
    ],
    wrapsInCard: false
  },
  {
    component: PaginationExample1,
    heading: '分页 vPagination',
    imports: ['vPagination'],
    intro: '页码与每页条数控制，适合表格和列表分页。',
    key: 'pagination',
    route: 'navigation:pagination',
    title: '分页',
    usage: ['数据量超过单页容量时。'],
    apiRows: [
      ['vPagination({ page, pageSize, total })', '创建分页。', 'vPagination({ total: 42 })'],
      ['pagination.onChange(handler)', '监听翻页。', 'pagination.onChange(({ page }) => ...)']
    ],
    wrapsInCard: true
  },
  {
    component: CodeExample1,
    heading: '代码展示 vCode',
    imports: ['vCode'],
    intro: '内置复制按钮的短代码展示。',
    key: 'code',
    route: 'data-display:code',
    title: '代码',
    usage: ['需要展示 SQL、配置等短片段时。'],
    apiRows: [
      ['vCode({ content, language })', '创建代码块。', 'vCode({ content: "SELECT 1" })'],
      ['code.copyLabel(text)', '自定义复制按钮文案。', "code.copyLabel('复制')"]
    ],
    wrapsInCard: true
  },
  {
    component: CardExample1,
    heading: '卡片 vCard',
    imports: ['vCard'],
    intro: '由头部、内容和操作区组成的通用容器。',
    key: 'card',
    route: 'data-display:card',
    title: '卡片',
    usage: ['需要把标题、内容与操作组织在一起时。'],
    apiRows: [
      ['vCard((card) => ...)', '创建卡片。', 'vCard((card) => ...)'],
      ['card.vCardHeader(text)', '设置头部。', "card.vCardHeader('标题')"],
      ['card.vCardBody(node)', '设置主体内容。', 'card.vCardBody((body) => ...)']
    ],
    wrapsInCard: false
  },
  {
    component: DynamicLoaderLiveDemo,
    sourceComponent: DynamicLoaderExample1,
    heading: '动态加载 vDynamicLoader',
    imports: ['div', 'vDynamicLoader'],
    intro: '按需加载模块并自动管理 loading / loaded / error 视图。',
    key: 'dynamic-loader',
    route: 'async:dynamic-loader',
    title: '动态加载',
    usage: ['需要懒加载业务模块时。'],
    apiRows: [
      ['vDynamicLoader({ loader, views })', '创建动态加载器。', 'vDynamicLoader({ loader })'],
      ['loader.retry()', '失败后重试。', 'loader.retry()']
    ],
    wrapsInCard: true
  },
  {
    component: MessageManagerExample1,
    heading: '消息管理器 vMessageManager',
    imports: ['stack', 'vMessageManager'],
    intro: '管理多条消息的独立容器，支持成功、警告等类型。',
    key: 'message-manager',
    route: 'feedback:message-manager',
    title: '消息管理器',
    usage: ['需要局部集中管理多条反馈消息时。'],
    apiRows: [
      ['vMessageManager()', '创建消息管理器。', 'vMessageManager()'],
      ['manager.success(content)', '显示成功消息。', "manager.success('保存成功')"]
    ],
    wrapsInCard: true
  }
]);

function createPage(config) {
  return {
    render() {
      return section((page) => {
        page.className(`components-route-page components-${config.key}-docs`);
        page.attr('data-component-route-item', config.route);
        page.attr(`data-${config.key}-docs`, 'true');
        page.h1(config.heading);
        page.p(config.intro);

        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            config.usage.forEach((item) => list.li(item));
          });
        });

        page.section((api) => {
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              config.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.h2('代码演示');
          const liveDemo = config.component();
          const sourceComponent = config.sourceComponent ?? config.component;
          const sourcePanel = ComponentSource({
            component: config.component,
            sourceComponent,
            imports: config.imports,
            title: `${config.key} 核心源码`
          });
          examples.h3(config.title);
          examples.div((live) => {
            live.className('components-misc-live');
            if (config.wrapsInCard) {
              live.child(
                vCard((card) => {
                  card.vCardBody((body) => body.child(liveDemo));
                })
              );
            } else {
              live.child(liveDemo);
            }
          });
          examples.child(sourcePanel);
        });
      });
    }
  };
}

const pages = Object.freeze(
  Object.fromEntries(pageConfigs.map((config) => [config.key, createPage(config)]))
);

export const DropdownDocumentationPage = () => pages.dropdown;
export const PaginationDocumentationPage = () => pages.pagination;
export const CodeDocumentationPage = () => pages.code;
export const CardDocumentationPage = () => pages.card;
export const DynamicLoaderDocumentationPage = () => pages['dynamic-loader'];
export const MessageManagerDocumentationPage = () => pages['message-manager'];
