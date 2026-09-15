import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { WhenFailedComponentExample, WhenFailedReportExample } from './demos/when-failed.js';
import { ComponentLifecycleDiagram, componentLifecyclePhases } from './component-lifecycle.js';
import {
  regionCompareBlocksSource,
  RegionFlushExample,
  RegionGateExample,
  RegionRebuildExample,
  RegionScopeExample,
  RegionStateVsSourceExample
} from './demos/region.js';

const regionDemos = [
  {
    component: RegionRebuildExample,
    description:
      '节点用 rebuildable() 声明为区域；rebuild() 清空子节点并按当前数据重跑它自己的 setup。区域外的输入框完全不受影响。',
    id: 'rebuild',
    imports: ['hstack', 'input', 'vButton', 'vstack', 'ul'],
    sourceTitle: '区域重建源码',
    title: '手动重建：rebuildable() + rebuild()'
  },
  {
    component: RegionGateExample,
    description:
      '谓词返回 false 时只写回函数值绑定、结构保持不变，并记为待重建；谓词恢复后 rebuild() 补一次重建。',
    id: 'gate',
    imports: ['div', 'hstack', 'vButton', 'vText', 'vstack'],
    sourceTitle: '谓词门禁源码',
    title: '时机门禁：rebuildable(() => !locked)'
  },
  {
    component: RegionScopeExample,
    description:
      'scope() 给独立子树声明数据来源，带参值函数 (d) => value 每次求值都能拿到它；只刷值不需要 rebuildable()。',
    id: 'source',
    imports: ['div', 'hstack', 'vButton', 'vText', 'vstack'],
    sourceTitle: '数据来源源码',
    title: '数据来源：scope()'
  },
  {
    component: RegionFlushExample,
    description:
      'flush() 只把绑定求值写回，元素引用不变；换成 rebuild() 才会重建结构。值变化用 flush，结构变化用 rebuild。',
    id: 'flush',
    imports: ['hstack', 'vButton', 'vText', 'vstack', 'div'],
    sourceTitle: '值级刷新源码',
    title: '值级刷新：flush()'
  },
  {
    component: RegionStateVsSourceExample,
    description:
      '三份一样的计数：组件内 ref 由值绑定自动写回；组件外 ref 同样自动驱动（可跨组件共享）；区域构建期直读 ref，写入触发子树重建。',
    extraSource: regionCompareBlocksSource,
    id: 'compare',
    imports: ['computed', 'div', 'ref', 'vButton', 'vText', 'vstack'],
    sourceTitle: 'ref 与区域对照源码',
    title: '数据来源对照：ref / 区域'
  }
];

const whenFailedDemos = [
  {
    component: WhenFailedReportExample,
    description:
      'handler 返回 null：只上报不替换结构。每次捕获都会 console.error（含原始堆栈），业务侧可用信号统计或上报。',
    id: 'report',
    imports: ['computed', 'div', 'ref', 'vstack'],
    scope: 'error',
    sourceTitle: '报告模式源码',
    title: '报告模式：返回 null 保现状'
  },
  {
    component: WhenFailedComponentExample,
    description:
      '组件对象定义与 render() 同层的 whenFailed 成员，ComponentNode 自动挂载；返回节点则替换组件输出为降级 UI。',
    id: 'component',
    imports: ['div', 'ref', 'span', 'vstack'],
    scope: 'error',
    sourceTitle: '组件协议降级源码',
    title: '组件协议：自带降级'
  }
];

export function ComponentLifecycleDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-lifecycle-page');
        page.attr('data-lifecycle-page', 'true');
        page.h1('组件生命周期');
        page.p(
          '一个组件从声明到销毁经过四个阶段；每个阶段只做该阶段该做的事，SSR 与手动更新之间才能保持一致。'
        );
        page.child(ComponentLifecycleDiagram());

        page.section((summary) => {
          summary.className('components-guide-section components-lifecycle-summary');
          summary.ul((list) => {
            componentLifecyclePhases.forEach((phase) =>
              list.li(`${phase.title}：${phase.summary}`)
            );
          });
        });

        page.section((region) => {
          region.className('components-guide-section components-lifecycle-region');
          region.attr('data-lifecycle-region', 'true');
          region.h2('可重建区域');
          region.p(
            '更新阶段里「结构随数据变化」由区域负责：值位置直接传 ref 句柄，结构变化用 rebuildable() 声明区域。'
          );
          region.ul((list) => {
            list.li('rebuildable(谓词?) 声明区域，rebuild() 清空子节点并重跑它自己的 setup。');
            list.li(
              '区域构建期读到的 ref 成为区域依赖，写入自动触发重建；值绑定（vText/attr/style）则只更新对应位置。'
            );
            list.li(
              'flush() 只求值写回绑定：不重建、不过谓词、值没变不写 DOM；值变化用它，结构变化才用 rebuild()。'
            );
            list.li(
              '区域内不保留 DOM 身份（焦点、滚动、第三方实例会重建），区域外的兄弟节点不受影响。'
            );
            list.li(
              '谓词只回答「这次要不要花重建」：为假时只写回绑定值并记为 rebuildPending()，结构不动。'
            );
          });
          regionDemos.forEach((demo) => region.child(RegionDemoSection(demo)));
        });

        page.section((boundary) => {
          boundary.className('components-guide-section components-lifecycle-errors');
          boundary.attr('data-lifecycle-errors', 'true');
          boundary.h2('错误边界');
          boundary.p(
            'whenFailed(handler) 声明子树边界：返回节点替换子树降级，返回 null 仅上报并保持现状。'
          );
          boundary.ul((list) => {
            list.li(
              '双入口：节点方法就地圈界；组件对象写与 render() 同层的 whenFailed 成员，自动挂载。'
            );
            list.li(
              '捕获永不静默：console.error 必发（含原始 error 对象），devtools 开启时追加 error 事件。'
            );
            list.li('嵌套边界内层接管即止步；返回空继续向外；handler 自身抛错交由外层处理。');
            list.li(
              '无边界时错误原样传播（fail fast）；区域更新失败仍先回滚保旧，再交给边界决定。'
            );
          });
          whenFailedDemos.forEach((demo) => boundary.child(RegionDemoSection(demo)));
        });
      });
    }
  };
}

function RegionDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    extraSource: demo.extraSource,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-lifecycle-demo');
        example.attr(demo.scope === 'error' ? 'data-error-demo' : 'data-region-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-lifecycle-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
