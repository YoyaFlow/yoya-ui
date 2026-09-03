import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { SuperTableExample } from './demos/vsupertable.js';

const demoDefinitions = Object.freeze([
  {
    id: 'basic',
    title: '增强表格',
    description: '列排序、筛选、跨分页行选择、分页联动与列固定。',
    component: SuperTableExample,
    sourceComponent: SuperTableExample,
    imports: ['div'],
    sourceTitle: 'vSuperTable 使用源码'
  }
]);

export function SuperTableDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-vsupertable-docs');
        page.attr('data-component-route-item', 'guides:super-table');
        page.header((header) => {
          header.h1('增强表格 vSuperTable');
          header.p('列配置驱动的增强表格：排序、筛选、行选择、分页、列固定与单元格编辑。');
        });
        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要列头排序与列筛选的业务列表。');
            list.li('需要跨分页行选择与分页联动。');
            list.li('需要列固定、拖拽调序或单元格编辑。');
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
        example.attr('data-vsupertable-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.attr('data-vsupertable-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
