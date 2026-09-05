import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { DevtoolsInspectorDemo } from './demos/devtools-inspector.js';

const devtoolsDemoDefinitions = Object.freeze([
  {
    id: 'inspector',
    title: '参考调试面板',
    description: '视图树、选中详情、事件时间线与 DOM 高亮，只消费 devtools 公开入口。',
    component: DevtoolsInspectorDemo,
    sourceComponent: DevtoolsInspectorDemo,
    imports: ['div', 'vStateNode', 'vText'],
    extraImports: {
      names: [
        'disableDevtools',
        'enableDevtools',
        'getDevtoolsDom',
        'getDevtoolsScope',
        'getDevtoolsSnapshot',
        'subscribeDevtools'
      ],
      from: '@yoyaflow/yoya-ui/devtools'
    },
    extraSource: "import '../devtools-inspector.css';",
    sourceTitle: '参考调试面板源码'
  }
]);

export function DevtoolsDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-devtools-docs');
        page.attr('data-component-route-item', 'guides:devtools');

        page.header((header) => {
          header.className('components-devtools-docs-header');
          header.h1('DevTools');
          header.p(
            '开发期视图树快照与生命周期事件流：默认关闭、零运行时开销，从独立子路径按需导入。'
          );
        });

        page.section((usage) => {
          usage.className('components-devtools-docs-usage');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('定位「页面为什么长这样」：查看当前视图树快照。');
            list.li('追踪一次交互改了什么：属性/样式/子项/文本/状态事件。');
            list.li('排查作用域问题：节点声明与生效的 access、Context 与 i18n。');
          });
        });

        page.section((api) => {
          api.className('components-devtools-docs-api');
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
              });
            });
            table.tbody((body) => {
              [
                ['enableDevtools()', '开启事件流，后续渲染与变更开始上报。'],
                [
                  'subscribeDevtools(listener)',
                  '订阅 commit/destroy/attr/style/child/text/state 事件。'
                ],
                ['getDevtoolsSnapshot(root)', '取可画树的纯数据快照（含稳定 id）。'],
                ['getDevtoolsDom(id)', '按 id 定位真实 DOM，用于高亮。'],
                ['getDevtoolsScope(id)', '读节点 access/Context/i18n 详情。']
              ].forEach(([name, purpose]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                });
              });
            });
          });
        });

        page.section((setup) => {
          setup.className('components-devtools-docs-setup');
          setup.h2('初始化');
          setup.p('devtools 不进入生产主入口，按需从独立子路径导入并显式开启。');
          setup.pre((pre) => {
            pre.className('devtools-api-signature');
            pre.code(
              "import { enableDevtools, subscribeDevtools } from '@yoyaflow/yoya-ui/devtools';\n\nenableDevtools();\nsubscribeDevtools((event) => {\n  console.log(event.seq, event.type, event.nodeId);\n});"
            );
          });
        });

        page.section((examples) => {
          examples.className('components-devtools-docs-examples');
          examples.h2('代码演示');
          devtoolsDemoDefinitions.forEach((demo) => {
            examples.child(DevtoolsExampleSection(demo));
          });
        });
      });
    }
  };
}

function DevtoolsExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: [...demo.imports, { names: demo.extraImports.names, from: demo.extraImports.from }],
    extraSource: demo.extraSource,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-devtools-demo');
        example.attr('data-devtools-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-devtools-demo-live');
          live.attr('data-devtools-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
