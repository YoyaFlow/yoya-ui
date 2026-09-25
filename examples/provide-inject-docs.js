import { section, vCard } from '../src/index.js';
import { ComponentSource } from './component-source.js';
import {
  ProvideInjectAsyncExample,
  ProvideInjectOverrideExample,
  ProvideInjectWorkspaceExample
} from './demos/provide-inject.js';

const provideInjectDemoDefinitions = Object.freeze([
  {
    id: 'workspace',
    title: '跨层共享同一份状态',
    description:
      '工作区组件 provide 一次，两层消费组件各自 inject，中间没有 props 透传；值里放句柄，写入后视图原地更新。',
    component: ProvideInjectWorkspaceExample,
    imports: ['computed', 'div', 'inject', 'provide', 'ref', 'vNode', 'vText', 'vstack'],
    sourceTitle: '跨层共享核心源码',
    actions: [
      { label: '改名为 yoya-flow', method: 'rename', args: ['yoya-flow'] },
      { label: '转交给 Bob', method: 'transfer', args: ['Bob'] }
    ]
  },
  {
    id: 'override',
    title: '就近覆盖与兄弟隔离',
    description:
      '同一个 key 在内层重新声明，只作用于那一块子树：内层读到 dark，两个外层兄弟照旧读外层句柄。',
    component: ProvideInjectOverrideExample,
    imports: ['div', 'inject', 'provide', 'ref', 'vNode', 'vstack'],
    sourceTitle: '就近覆盖核心源码',
    actions: [{ label: '切换外层主题', method: 'toggle', args: [] }]
  },
  {
    id: 'async',
    title: '异步构建的子树',
    description:
      'vDynamicLoader 的视图在挂到树上之前就构建完了，inject 仍沿父链读到祖先声明；句柄更新后角标跟着走。',
    component: ProvideInjectAsyncExample,
    imports: ['div', 'inject', 'provide', 'ref', 'vDynamicLoader', 'vNode', 'vstack'],
    sourceTitle: '异步视图核心源码',
    actions: [
      { label: '加载视图', method: 'load', args: [] },
      { label: '切换租户', method: 'setTenant', args: ['globex'] }
    ]
  }
]);

export function ProvideInjectDocumentationPage() {
  return section((page) => {
    page.className('components-route-page components-provide-inject-docs');
    page.attr('data-component-route-item', 'guides:provide-inject');

    page.header((header) => {
      header.className('components-provide-inject-docs-header');
      header.h1('跨组件共享');
      header.p(
        'provide(key, value) 声明一份值，后代组件用 inject(key, fallback) 就近读取；' +
          '请求级数据仍走 withContext + currentContext 的作用域注入。'
      );
    });

    page.section((usage) => {
      usage.className('components-provide-inject-docs-usage');
      usage.h2('何时使用');
      usage.ul((list) => {
        list.li('隔了好几层的组件要共享同一份状态，又不想一路透传 props。');
        list.li('同一块子树要读到局部不同的配置（主题、只读开关、货币等）。');
        list.li('异步加载或懒解析的组件也要读到祖先声明的数据。');
        list.li('每请求的数据（当前用户、租户、语言）用 withContext 走作用域注入。');
      });
    });

    page.section((api) => {
      api.className('components-provide-inject-docs-api');
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
          [
            [
              'provide(key, value)',
              '在当前构建帧声明，归属这个节点，随节点销毁；帧外调用抛错。',
              "provide('user', { name: 'Ada' })"
            ],
            [
              'inject(key, fallback)',
              '就近读取：词法构建帧 → 父链 → withContext 层 → 全局层 → fallback。',
              "const user = inject('user')"
            ],
            [
              'withContext(providers, build)',
              '调用栈作用域，构建期可见；适合请求级注入。',
              'withContext({ tenant }, () => buildPage())'
            ],
            [
              'currentContext(key, fallback)',
              '只读 withContext / 全局层，不查 provide 链。',
              "currentContext('tenant')"
            ],
            [
              'installContext(providers)',
              '单用户 SPA 装一次全局兜底层。',
              'installContext({ locale })'
            ],
            [
              'buildInProviderScope(host, build)',
              '先挂后建：子树挂到 host 之前构建时用它声明构建帧。',
              'buildInProviderScope(host, () => view())'
            ],
            [
              'renderToString(page, { context })',
              'SSR：每请求注入作用域层，请求之间不共享。',
              'renderToString(page, { context })'
            ]
          ].forEach(([name, purpose, example]) => {
            body.tr((row) => {
              row.td((cell) => cell.code(name));
              row.td(purpose);
              row.td((cell) => cell.code(example));
            });
          });
        });
      });
    });

    page.section((values) => {
      values.className('components-provide-inject-docs-values');
      values.h2('值位置口径');
      values.p(
        '共享的通常是句柄，不是快照：纯占位直接把句柄传给值位置，派生文本才包 computed。' +
          '写成模板串取值会得到渲染那一刻的死快照，之后写入不再更新。'
      );
      values.pre((pre) => {
        pre.className('provide-inject-value-correct');
        pre.code(
          '// 正确：句柄进值位置\n' +
            "provide('project', { name, members });\n" +
            'line.child(project.name);\n' +
            'line.child(project.members);\n\n' +
            '// 正确：派生文本用 computed\n' +
            'const summary = computed(() => `${project.name.value}，${project.members.value} 人`);\n' +
            'block.child(vText(summary));'
        );
      });
      values.pre((pre) => {
        pre.className('provide-inject-value-wrong');
        pre.code(
          '// 反例：渲染时取值，写进去的是死快照\n' + 'line.child(`项目：${project.name.value}`);'
        );
      });
    });

    page.section((examples) => {
      examples.className('components-provide-inject-docs-examples');
      examples.h2('代码演示');
      provideInjectDemoDefinitions.forEach((demo) => {
        examples.child(ProvideInjectExampleSection(demo));
      });
    });
  });
}

function ProvideInjectExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.component,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return section((example) => {
    example.className('components-provide-inject-demo');
    example.attr('data-provide-inject-demo', demo.id);
    example.child(
      vCard((card) => {
        card.vCardHeader(demo.title);
        card.vCardBody((body) => {
          body.p(demo.description);
          body.div((live) => {
            live.className('components-provide-inject-demo-live');
            live.attr('data-provide-inject-demo-live', 'true');
            live.child(liveDemo);
          });
        });
        if (demo.actions.length > 0) {
          card.vCardFooter((footer) => {
            demo.actions.forEach((action) => {
              footer.vButton(action.label, (button) => {
                button.on('click', () => liveDemo[action.method](...action.args));
              });
            });
          });
        }
      })
    );
    example.child(sourcePanel);
  });
}
