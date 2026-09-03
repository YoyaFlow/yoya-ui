import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { TreeTableExample } from './demos/vtreetable.js';

const demoDefinitions = Object.freeze([
  {
    id: 'basic',
    title: '树形表格',
    description: '树形数据按层级展开，支持父子选择联动与懒加载。',
    component: TreeTableExample,
    sourceComponent: TreeTableExample,
    imports: ['div'],
    sourceTitle: 'vTreeTable 使用源码'
  }
]);

export function TreeTableDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-vtreetable-docs');
        page.attr('data-component-route-item', 'guides:tree-table');
        page.header((header) => {
          header.h1('树形表格 vTreeTable');
          header.p('在列中并排展示树形层级，支持展开/折叠、父子选择联动与懒加载。');
        });
        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要在大层级数据里按列浏览。');
            list.li('需要聚合列维度展示树形业务对象。');
          });
        });
        page.section((examples) => {
          examples.h2('代码演示');
          demoDefinitions.forEach((demo) => examples.child(DemoSection(demo)));
        });
      });
    }
  };
}

function DemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });
  return {
    render() {
      return section((example) => {
        example.attr('data-vtreetable-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.attr('data-vtreetable-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
