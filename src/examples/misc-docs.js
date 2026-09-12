import { section, vCard } from '../index.js';
import { ComponentSource } from './component-source.js';
import { CodeExample1 } from './demos/code.js';
import { DropdownMenuExample1 } from './demos/dropdown-menu.js';
import { DynamicLoaderExample1 } from './demos/dynamic-loader.js';
import { MessageManagerExample1 } from './demos/message-manager.js';
import { PaginationExample1 } from './demos/pagination.js';

// vCard 自身就是页面壳组件，放进 demos/ 会被「页面壳进演示」检查拦截；
// 本页演示对象即 vCard，因此与页面壳同文件定义，live 与源码面板仍只有一份实现。
function CardExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务总览');
        card.vCardBody((body) => body.p('当前状态稳定。'));
        card.vCardFooter((footer) => footer.vButton('查看详情'));
      });
    }
  };
}

// 演示定义：一页一个 demo，live 与源码面板共用同一个组件（唯一渲染路径）。
const demoDefinitions = Object.freeze([
  {
    apiRows: [
      ['vDropdownMenu((menu) => ...)', '创建下拉菜单。', 'vDropdownMenu((menu) => ...)'],
      ['menu.placement(value)', '设置浮层位置。', "menu.placement('bottom-end')"],
      ['menu.closeOnSelect(value)', '选择后是否保持展开。', 'menu.closeOnSelect(false)']
    ],
    category: 'navigation',
    component: DropdownMenuExample1,
    description: '按钮触发的浮层菜单，支持键盘打开与连续点选。',
    heading: '下拉菜单 vDropdownMenu',
    imports: ['ref', 'vDropdownMenu', 'vText', 'vstack'],
    intro: '下拉菜单把多个动作收纳进浮层，由按钮触发，键盘可达。',
    key: 'dropdown',
    route: 'navigation:dropdown',
    title: '下拉菜单',
    usage: ['需要把多个动作收纳到浮层时。', '需要键盘可达的菜单入口时。']
  },
  {
    apiRows: [
      ['vPagination({ page, pageSize, total })', '创建分页。', 'vPagination({ total: 42 })'],
      ['pagination.onChange(handler)', '监听翻页。', 'pagination.onChange(({ page }) => ...)']
    ],
    category: 'navigation',
    component: PaginationExample1,
    description: '页码与每页条数控制，适合表格和列表分页。',
    heading: '分页 vPagination',
    imports: ['computed', 'ref', 'vPagination', 'vText', 'vstack'],
    intro: '分页把长列表切成可翻页的片段，并提供当前页与总条数信息。',
    key: 'pagination',
    route: 'navigation:pagination',
    title: '分页',
    usage: ['数据量超过单页容量时。']
  },
  {
    apiRows: [
      ['vCode({ content, language })', '创建代码块。', 'vCode({ content: "SELECT 1" })'],
      ['code.copyLabel(text)', '自定义复制按钮文案。', "code.copyLabel('复制')"]
    ],
    category: 'data-display',
    component: CodeExample1,
    description: '内置复制按钮的短代码展示。',
    heading: '代码展示 vCode',
    imports: ['vCode'],
    intro: 'vCode 用于展示 SQL、配置等短代码片段，并附带复制按钮。',
    key: 'code',
    route: 'data-display:code',
    title: '代码',
    usage: ['需要展示 SQL、配置等短片段时。']
  },
  {
    apiRows: [
      ['vCard((card) => ...)', '创建卡片。', 'vCard((card) => ...)'],
      ['card.vCardHeader(text)', '设置头部。', "card.vCardHeader('标题')"],
      ['card.vCardBody(node)', '设置主体内容。', 'card.vCardBody((body) => ...)']
    ],
    category: 'data-display',
    component: CardExample1,
    description: '由头部、内容和操作区组成的通用容器。',
    heading: '卡片 vCard',
    imports: ['vCard'],
    intro: 'vCard 把标题、内容与操作组织在同一个容器里，可作为页面区块或列表项。',
    key: 'card',
    route: 'data-display:card',
    shell: false,
    title: '卡片',
    usage: ['需要把标题、内容与操作组织在一起时。']
  },
  {
    apiRows: [
      ['vDynamicLoader({ loader, views })', '创建动态加载器。', 'vDynamicLoader({ loader })'],
      ['loader.retry()', '失败后重试。', 'loader.retry()']
    ],
    category: 'async',
    component: DynamicLoaderExample1,
    description: '按需加载模块，并自动管理 pending / loading / loaded / error 视图。',
    heading: '动态加载 vDynamicLoader',
    imports: ['div', 'ref', 'vDynamicLoader', 'vText', 'vstack'],
    intro:
      'vDynamicLoader 把异步模块的加载状态收敛到一个节点上：视图由状态驱动，缓存与重试由组件内部管理。',
    key: 'dynamic-loader',
    route: 'async:dynamic-loader',
    title: '动态加载',
    usage: ['需要懒加载业务模块时。', '需要统一处理加载中与失败重试时。']
  },
  {
    apiRows: [
      ['vMessageManager()', '创建消息管理器。', 'vMessageManager()'],
      ['manager.success(content)', '显示成功消息。', "manager.success('保存成功')"]
    ],
    category: 'feedback',
    component: MessageManagerExample1,
    description: '管理多条消息的独立容器，支持成功、警告等类型。',
    heading: '消息管理器 vMessageManager',
    imports: ['vMessageManager', 'vstack'],
    intro: 'vMessageManager 在局部区域集中管理多条反馈消息，适合卡片或面板内部的状态提示。',
    key: 'message-manager',
    route: 'feedback:message-manager',
    title: '消息管理器',
    usage: ['需要局部集中管理多条反馈消息时。']
  }
]);

function ApiSection(definition) {
  return section((api) => {
    api.className('components-misc-api');
    api.attr(`data-${definition.category}-api`, definition.key);
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
        definition.apiRows.forEach(([name, purpose, example]) => {
          body.tr((row) => {
            row.td((cell) => cell.code(name));
            row.td(purpose);
            row.td((cell) => cell.code(example));
          });
        });
      });
    });
  });
}

/** 演示区：与其它文档页同一形态（data-<category>-demo / -live + ComponentSource）。 */
function DemoSection(definition) {
  const liveDemo = definition.component();
  const sourcePanel = ComponentSource({
    component: definition.component,
    imports: definition.imports,
    title: `${definition.key} 核心源码`
  });
  const wrapsInCard = definition.shell !== false;

  return {
    render() {
      return section((example) => {
        example.className(`components-${definition.category}-demo`);
        example.attr(`data-${definition.category}-demo`, 'basic');
        example.h3(definition.title);
        example.p(definition.description);
        example.div((live) => {
          live.className(`components-${definition.category}-demo-live`);
          live.attr(`data-${definition.category}-demo-live`, 'true');
          live.child(
            wrapsInCard
              ? vCard((card) => {
                  card.vCardBody((body) => body.child(liveDemo));
                })
              : liveDemo
          );
        });
        example.child(sourcePanel);
      });
    }
  };
}

function createPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-${definition.category}-docs components-${definition.key}-docs`
        );
        page.attr('data-component-route-item', definition.route);
        page.attr(`data-${definition.category}-docs`, definition.key);

        page.header((header) => {
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-misc-usage');
          usage.h2('何时使用');
          usage.ul((list) => {
            definition.usage.forEach((item) => list.li(item));
          });
        });

        page.child(ApiSection(definition));

        page.section((examples) => {
          examples.className('components-misc-examples');
          examples.h2('代码演示');
          examples.child(DemoSection(definition));
        });
      });
    }
  };
}

const pages = Object.freeze(
  Object.fromEntries(demoDefinitions.map((definition) => [definition.key, createPage(definition)]))
);

export const DropdownDocumentationPage = () => pages.dropdown;
export const PaginationDocumentationPage = () => pages.pagination;
export const CodeDocumentationPage = () => pages.code;
export const CardDocumentationPage = () => pages.card;
export const DynamicLoaderDocumentationPage = () => pages['dynamic-loader'];
export const MessageManagerDocumentationPage = () => pages['message-manager'];
