import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { ComponentLifecycleDiagram, componentLifecyclePhases } from './component-lifecycle.js';
import { RegionDataSourceExample, RegionGateExample, RegionRerunExample } from './demos/region.js';

const regionDemos = [
  {
    component: RegionRerunExample,
    description:
      '节点用 rebuildable() 声明为区域；rerun() 清空子节点并按当前数据重跑它自己的 setup。区域外的输入框完全不受影响。',
    id: 'rerun',
    imports: ['hstack', 'input', 'vButton', 'vstack'],
    sourceTitle: '区域重建源码',
    title: '手动重建：rebuildable() + rerun()'
  },
  {
    component: RegionGateExample,
    description:
      '谓词返回 false 时只写回函数值绑定、结构保持不变，并记为待重建；谓词恢复后 rerun() 补一次重建。',
    id: 'gate',
    imports: ['div', 'hstack', 'vButton', 'vText', 'vstack'],
    sourceTitle: '谓词门禁源码',
    title: '时机门禁：rebuildable(() => !locked)'
  },
  {
    component: RegionDataSourceExample,
    description:
      '普通区域用 dataSource() 声明数据来源，带参值函数 (source) => value 每次求值都能拿到它；不声明就直接报错。',
    id: 'source',
    imports: ['div', 'hstack', 'vButton', 'vText', 'vstack'],
    sourceTitle: '区域数据来源源码',
    title: '数据来源：dataSource()'
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
            '更新阶段里「结构随数据变化」由区域负责：组件级用 vStateNode，节点级用 rebuildable() 声明区域。'
          );
          region.ul((list) => {
            list.li('rebuildable(谓词?) 声明区域，rerun() 清空子节点并重跑它自己的 setup。');
            list.li(
              '区域内不保留 DOM 身份（焦点、滚动、第三方实例会重建），区域外的兄弟节点不受影响。'
            );
            list.li(
              '谓词只回答「这次要不要花重建」：为假时只写回函数值绑定并记为 regionPending()，结构不动。'
            );
            list.li('带参值函数需要 dataSource()；vStateNode 内部的区域默认继承宿主状态。');
          });
          regionDemos.forEach((demo) => region.child(RegionDemoSection(demo)));
        });
      });
    }
  };
}

function RegionDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-lifecycle-demo');
        example.attr('data-region-demo', demo.id);
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
