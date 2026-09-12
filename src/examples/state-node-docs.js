import { section, vCard } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  dynamicFormFieldsSource,
  StateDynamicAttrsExample1,
  StateMethodsExample,
  StateDynamicFormExample,
  StateCounterExample1,
  StateEventOverwriteExample1,
  StateFragmentExample1,
  StateInputExample1,
  StateKeyedExample1,
  StateRebuildExample1,
  StateToggleExample1
} from './demos/state-node.js';

function StateDynamicFormDemo() {
  const form = StateDynamicFormExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态表单');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('切换类型重建字段；输入值只写入 ref，不重建输入框。');
            stack.child(form);
          });
        });
      });
    }
  };
}

function StateMethodsDemo() {
  const counter = StateMethodsExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义方法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('组件对象上暴露操作方法，内部写 ref，文本绑定自动同步。');
            stack.child(counter);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton('+1', (button) => {
            button.variant('primary').on('click', () => counter.increment());
          });
          footer.vButton('-1', (button) => {
            button.on('click', () => counter.decrement());
          });
          footer.vButton('重置', (button) => {
            button.on('click', () => counter.reset());
          });
        });
      });
    }
  };
}

const stateDemoDefinitions = Object.freeze([
  {
    id: 'counter',
    title: '文本值绑定',
    description: 'vText 直接接 ref / computed，写入后只更新该文本，DOM 节点不替换。',
    component: StateCounterExample1,
    sourceComponent: StateCounterExample1,
    imports: ['computed', 'ref', 'vText', 'vstack'],
    sourceTitle: '文本值绑定核心源码'
  },
  {
    id: 'input',
    title: '输入保持焦点（值绑定）',
    description: '事件里写 ref，输出文本与按钮禁用态声明为绑定，输入框 DOM 不被替换。',
    component: StateInputExample1,
    sourceComponent: StateInputExample1,
    imports: ['computed', 'ref', 'vText', 'vstack'],
    sourceTitle: '输入值绑定核心源码'
  },
  {
    id: 'rebuild',
    title: '区域重建',
    description: 'rebuildable() 区域在构建期直读 ref，写入后子树整体重建，样式随构建重新落位。',
    component: StateRebuildExample1,
    sourceComponent: StateRebuildExample1,
    imports: ['batch', 'ref', 'vstack'],
    sourceTitle: '区域重建核心源码'
  },
  {
    id: 'toggle',
    title: '结构切换',
    description: '显示/隐藏这类结构变化：把分支放进 rebuildable() 区域，写入即重建。',
    component: StateToggleExample1,
    sourceComponent: StateToggleExample1,
    imports: ['ref', 'vstack'],
    sourceTitle: '结构切换核心源码'
  },
  {
    id: 'dynamic-form',
    title: '动态表单',
    description: '区域只依赖类型 ref：切换类型重建字段，输入值变化只收集不重建。',
    component: StateDynamicFormDemo,
    sourceComponent: StateDynamicFormExample,
    imports: ['div', 'ref', 'vForm', 'vFormItem', 'vInput', 'vSelect'],
    sourceTitle: '动态表单核心源码',
    extraSource: dynamicFormFieldsSource
  },
  {
    id: 'methods',
    title: '自定义方法',
    description: '组件对象暴露操作方法，方法内写 ref，计数文本通过值绑定自动同步。',
    component: StateMethodsDemo,
    sourceComponent: StateMethodsExample,
    imports: ['div', 'ref', 'vText'],
    sourceTitle: '自定义方法核心源码'
  },
  {
    id: 'fragment',
    title: '多根 fragment',
    description: 'child() 接受数组时，父容器直接落实多个并列子节点。',
    component: StateFragmentExample1,
    sourceComponent: StateFragmentExample1,
    imports: ['vTable', 'vTr'],
    sourceTitle: '多根 fragment 核心源码'
  },
  {
    id: 'keyed-children',
    title: 'Keyed 子节点',
    description: 'addChild(key, node) 登记唯一 key，元素子节点自动带 data-row-key。',
    component: StateKeyedExample1,
    sourceComponent: StateKeyedExample1,
    imports: ['div', 'vstack'],
    sourceTitle: 'Keyed 子节点核心源码'
  },
  {
    id: 'event-overwrite',
    title: '事件覆盖',
    description: '同一节点重复 on() 覆盖上次 handler，不会叠加触发。',
    component: StateEventOverwriteExample1,
    sourceComponent: StateEventOverwriteExample1,
    imports: ['vstack', 'vText'],
    sourceTitle: '事件覆盖核心源码'
  },
  {
    id: 'dynamic-attrs',
    title: '动态属性绑定',
    description: 'attr / style 接收 ref / computed，随写入自动更新；返回 null 时移除属性或样式。',
    component: StateDynamicAttrsExample1,
    sourceComponent: StateDynamicAttrsExample1,
    imports: ['computed', 'ref', 'vText', 'vstack'],
    sourceTitle: '动态属性绑定核心源码'
  }
]);

export function StateNodeDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-state-docs');
        page.attr({
          'data-component-route-item': 'guides:state-node',
          'data-state-docs': 'state'
        });

        page.header((header) => {
          header.className('components-state-docs-header');
          header.h1('状态管理：ref 与值绑定');
          header.p(
            'ref() 持有状态、computed() 派生；vText / attr / style 的值位置直接传句柄，写入后自动更新到 DOM，结构变化走 rebuildable() 区域重建。'
          );
        });

        page.section((usage) => {
          usage.className('components-state-docs-usage');
          usage.attr('data-state-usage', 'true');
          usage.h2('何时使用');
          usage.p('组件需要保存计数、开关、加载状态等内部状态时，用 ref 收敛状态源。');
          usage.ul((list) => {
            list.li('文本、属性、样式跟随状态：值位置直接传句柄，无需手写同步。');
            list.li('派生值用 computed 声明，依赖变化自动重算。');
            list.li('结构变化（显示/隐藏、字段切换）用 rebuildable() 区域读取信号。');
          });
        });

        page.section((api) => {
          api.className('components-state-docs-api');
          api.h2('常用 API');
          api.p('ref / computed 从包入口导入，句柄经 .value 读写，可传入任意值绑定位置。');
          api.pre((pre) => {
            pre.className('state-api-signature');
            pre.code(`const count = ref(0);
const double = computed(() => count.value * 2);

div((node) => {
  node.child(vText(double)); // 值位置直接传句柄
});`);
          });
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
                  'ref(initial)',
                  '创建可写信号句柄，经 .value 读写。',
                  'const count = ref(0); count.value += 1;'
                ],
                [
                  'computed(fn)',
                  '创建只读派生信号，惰性求值并缓存，依赖变化自动重算。',
                  'computed(() => count.value * 2)'
                ],
                [
                  'batch(fn)',
                  '合并 fn 内的多次写入，提交一次通知。',
                  'batch(() => { a.value = 1; })'
                ],
                [
                  'vText / attr / style / toggleClass 的值位置',
                  '接受句柄，写入后自动提交到该位置；attr 值为 null 时移除属性。',
                  'node.attr("title", computed(() => name.value))'
                ],
                [
                  'node.rebuildable(predicate?)',
                  '声明区域：构建期读到的信号成为依赖，写入触发子树重建。',
                  'node.rebuildable(() => true)'
                ],
                ['handle.peek()', '读取当前值且不建立依赖。', 'count.peek()'],
                ['isSignal(value)', '判断是否为库句柄。', 'isSignal(count)'],
                [
                  'batch / update 链式',
                  'handle.update(fn) 以当前值计算并写回。',
                  'count.update((n) => n + 1)'
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

        page.section((examples) => {
          examples.className('components-state-docs-examples');
          examples.h2('代码演示');
          examples.p(
            '十个示例分别展示文本值绑定、输入值绑定、区域重建、结构切换、动态表单、自定义方法、多根 fragment、Keyed 子节点、事件覆盖与动态属性绑定。'
          );
          stateDemoDefinitions.forEach((demo) => {
            examples.child(StateExampleSection(demo));
          });
        });
      });
    }
  };
}

function StateExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle,
    extraSource: demo.extraSource
  });

  return {
    render() {
      return section((example) => {
        example.className('components-state-demo');
        example.attr('data-state-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-state-demo-live');
          live.attr('data-state-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
