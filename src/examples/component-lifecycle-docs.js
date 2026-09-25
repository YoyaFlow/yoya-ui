import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  ComponentLifecycleDiagram,
  componentLifecyclePhases,
  DataUpdateFlowDiagram
} from './component-lifecycle.js';
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
    imports: ['hstack', 'input', 'vButton', 'vNode', 'vstack', 'ul'],
    sourceTitle: '区域重建源码',
    title: '手动重建：rebuildable() + rebuild()'
  },
  {
    component: RegionGateExample,
    description:
      '忙碌（编辑 / 拖拽）时谓词拦截重建：区域内值绑定照常刷新、列表结构不动并记为待重建；恢复空闲后一次 rebuild() 补齐全部变更。',
    id: 'gate',
    imports: ['computed', 'div', 'ref', 'vNode', 'vText', 'vstack'],
    sourceTitle: '谓词门禁源码',
    title: '时机门禁：忙碌时跳过结构重建'
  },
  {
    component: RegionScopeExample,
    description:
      'scope() 给独立子树声明数据来源，带参值函数 (d) => value 每次求值都能拿到它；只刷值不需要 rebuildable()。',
    id: 'source',
    imports: ['div', 'hstack', 'vButton', 'vNode', 'vText', 'vstack'],
    sourceTitle: '数据来源源码',
    title: '数据来源：scope()'
  },
  {
    component: RegionFlushExample,
    description:
      'flush() 只把绑定求值写回，元素引用不变；换成 rebuild() 才会重建结构。值变化用 flush，结构变化用 rebuild。',
    id: 'flush',
    imports: ['hstack', 'vButton', 'vNode', 'vText', 'vstack', 'div'],
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

export function ComponentLifecycleDocumentationPage() {
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
        componentLifecyclePhases.forEach((phase) => list.li(`${phase.title}：${phase.summary}`));
      });
    });

    page.section((update) => {
      update.className('components-guide-section components-lifecycle-update');
      update.attr('data-lifecycle-update', 'true');
      update.h2('数据更新机制');
      update.p('值变化走绑定原地写回，结构变化走区域重建；两条路径的代价与 DOM 身份影响不同。');
      update.child(DataUpdateFlowDiagram());
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
  });
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
