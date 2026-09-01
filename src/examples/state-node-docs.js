import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  dynamicFormFieldsSource,
  StateMethodsDemo,
  StateMethodsExample,
  StateDynamicFormDemo,
  StateDynamicFormExample,
  StateCounterExample1,
  StateInputExample1,
  StateRebuildExample1,
  StateToggleExample1
} from './demos/state-node.js';

const stateDemoDefinitions = Object.freeze([
  {
    id: 'counter',
    title: '局部更新',
    description: '提供 update 时，setState 只同步变化节点，不重建视图树。',
    component: StateCounterExample1,
    sourceComponent: StateCounterExample1,
    imports: ['vCard', 'vStateNode', 'vText'],
    sourceTitle: '局部更新核心源码'
  },
  {
    id: 'input',
    title: '输入保持焦点',
    description: 'update 只更新输出文本，输入框 DOM 保持复用，焦点不会丢失。',
    component: StateInputExample1,
    sourceComponent: StateInputExample1,
    imports: ['vCard', 'vStateNode', 'vText'],
    sourceTitle: '输入保持焦点核心源码'
  },
  {
    id: 'rebuild',
    title: '全量重建',
    description: '不提供 update 时，setState 会销毁旧内容并重新 render。',
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
    description: 'config 上定义的操作方法会挂到组件对象，外部可直接调用。',
    component: StateMethodsDemo,
    sourceComponent: StateMethodsExample,
    imports: ['div', 'vStateNode', 'vText'],
    sourceTitle: '自定义方法核心源码'
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
          header.p('state() 保存状态，render() 构建视图，update() 负责状态变化后的同步。');
        });

        page.section((usage) => {
          usage.className('components-state-docs-usage');
          usage.attr('data-state-usage', 'true');
          usage.h2('何时使用');
          usage.p('需要把组件内部状态和视图同步收敛到一个对象组件里时使用 vStateNode。');
          usage.ul((list) => {
            list.li('组件需要保存计数、开关、加载状态等内部状态。');
            list.li('状态变化后希望只更新局部节点，不重建整个视图树。');
            list.li('简单结构变化时可以省略 update，使用全量重建。');
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
    return div(vText(String(state.count)));
  },
  update(state, api, changed) {}
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
                  '创建带状态的对象组件。',
                  'vStateNode({ state: () => ({ count: 0 }), render() {} })'
                ],
                [
                  'component.setState(patch)',
                  '合并状态并触发 update 或重建。',
                  'component.setState({ count: 1 })'
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
                  'vStateNode 内部生命周期函数，不对外暴露；返回 true 可强制重建。',
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
            '六个示例分别展示局部更新、输入保持焦点、全量重建、结构切换、动态表单和自定义方法。'
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
