import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  dynamicFormFieldsSource,
  StateMethodsDemo,
  StateMethodsExample,
  StateDynamicFormDemo,
  StateDynamicFormExample,
  StateCounterExample1,
  StateEventOverwriteExample1,
  StateFragmentExample1,
  StateInputExample1,
  StateKeyedExample1,
  StateRebuildExample1,
  StateToggleExample1
} from './demos/state-node.js';

const stateDemoDefinitions = Object.freeze([
  {
    id: 'counter',
    title: '函数值绑定',
    description: 'render 里把文本声明为 (state) => value，setState 后只求值写回该绑定。',
    component: StateCounterExample1,
    sourceComponent: StateCounterExample1,
    imports: ['vCard', 'vStateNode', 'vText'],
    sourceTitle: '函数值绑定核心源码'
  },
  {
    id: 'input',
    title: '输入保持焦点（值绑定）',
    description: 'input 的 value 与输出文本都声明为函数值绑定，输入框 DOM 不被替换。',
    component: StateInputExample1,
    sourceComponent: StateInputExample1,
    imports: ['vCard', 'vStateNode', 'vText'],
    sourceTitle: '输入值绑定核心源码'
  },
  {
    id: 'rebuild',
    title: '全量重建',
    description: '没有函数值绑定且省略 update 时，setState 会销毁旧内容并重新 render。',
    component: StateRebuildExample1,
    sourceComponent: StateRebuildExample1,
    imports: ['vCard', 'vStateNode'],
    sourceTitle: '全量重建核心源码'
  },
  {
    id: 'toggle',
    title: '结构切换',
    description: 'update 返回 true 时强制重建，适合显示/隐藏这类结构变化。',
    component: StateToggleExample1,
    sourceComponent: StateToggleExample1,
    imports: ['vCard', 'vStateNode'],
    sourceTitle: '结构切换核心源码'
  },
  {
    id: 'dynamic-form',
    title: '动态表单',
    description: '下拉框切换类型时按配置重建字段，输入值变化只收集不重建。',
    component: StateDynamicFormDemo,
    sourceComponent: StateDynamicFormExample,
    imports: ['div', 'vForm', 'vFormItem', 'vInput', 'vSelect', 'vStateNode'],
    sourceTitle: '动态表单核心源码',
    extraSource: dynamicFormFieldsSource
  },
  {
    id: 'methods',
    title: '自定义方法',
    description: 'config 上的操作方法修改 state，计数文本通过函数值绑定自动同步。',
    component: StateMethodsDemo,
    sourceComponent: StateMethodsExample,
    imports: ['div', 'vStateNode', 'vText'],
    sourceTitle: '自定义方法核心源码'
  },
  {
    id: 'fragment',
    title: '多根 fragment',
    description: 'vStateNode 的 render 返回数组时，父容器直接落实多个并列子节点。',
    component: StateFragmentExample1,
    sourceComponent: StateFragmentExample1,
    imports: ['vCard', 'vStateNode', 'vTr'],
    sourceTitle: '多根 fragment 核心源码'
  },
  {
    id: 'keyed-children',
    title: 'Keyed 子节点',
    description: 'addChild(key, node) 登记唯一 key，元素子节点自动带 data-row-key。',
    component: StateKeyedExample1,
    sourceComponent: StateKeyedExample1,
    imports: ['div', 'vCard'],
    sourceTitle: 'Keyed 子节点核心源码'
  },
  {
    id: 'event-overwrite',
    title: '事件覆盖',
    description: '同一节点重复 on() 覆盖上次 handler，不会叠加触发。',
    component: StateEventOverwriteExample1,
    sourceComponent: StateEventOverwriteExample1,
    imports: ['div', 'vCard'],
    sourceTitle: '事件覆盖核心源码'
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
          header.h1('vStateNode 状态节点');
          header.p(
            'state() 保存状态，render() 构建视图；render 里的 vText/attr/style 支持 (state) => value 函数值绑定，setState 后统一求值写回，结构变化走 update/重建。'
          );
        });

        page.section((usage) => {
          usage.className('components-state-docs-usage');
          usage.attr('data-state-usage', 'true');
          usage.h2('何时使用');
          usage.p('需要把组件内部状态和视图同步收敛到一个对象组件里时使用 vStateNode。');
          usage.ul((list) => {
            list.li('组件需要保存计数、开关、加载状态等内部状态。');
            list.li('文本、属性、样式跟随状态：直接声明函数值绑定，无需手写 update。');
            list.li('结构变化（显示/隐藏、字段切换）用 update 返回 true 或全量重建。');
          });
        });

        page.section((api) => {
          api.className('components-state-docs-api');
          api.h2('常用 API');
          api.p('vStateNode 返回一个带 render() 的对象组件，可以直接传给 child()。');
          api.pre((pre) => {
            pre.className('state-api-signature');
            pre.code(`vStateNode({
  state: () => ({ count: 0 }),
  render(state, api) {
    return div(vText((s) => String(s.count)));
  }
})`);
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
                  'vStateNode({ state, render, update })',
                  '创建带状态的对象组件；render 中可声明函数值绑定。',
                  'vStateNode({ state: () => ({ count: 0 }), render() {} })'
                ],
                [
                  'component.setState(patch)',
                  '合并状态并同步刷新函数值绑定；存在 update 时先执行 update。',
                  'component.setState({ count: 1 })'
                ],
                [
                  'vText / attr / style 的函数值',
                  '值为 (state) => value 时登记为绑定，setState 后自动求值写回；返回 null 移除属性/样式。',
                  'vText((s) => String(s.count))'
                ],
                [
                  'config 自定义方法',
                  'config 上的自定义函数会挂到组件对象，外部可直接调用。',
                  'component.increment()'
                ],
                ['component.state()', '返回当前状态的浅拷贝。', 'component.state().count'],
                [
                  'component.subscribe(listener)',
                  '订阅状态变化。',
                  'component.subscribe((state) => {})'
                ],
                [
                  'update(state, api, changed)',
                  'vStateNode 内部生命周期函数，不对外暴露；返回 true 可强制重建（结构变化用）。',
                  'update(state, api, changed) { return true; }'
                ],
                ['component.destroy()', '清理订阅和内部视图。', 'component.destroy()']
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
            '九个示例分别展示函数值绑定、输入值绑定、全量重建、结构切换、动态表单、自定义方法、多根 fragment、Keyed 子节点与事件覆盖。'
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
