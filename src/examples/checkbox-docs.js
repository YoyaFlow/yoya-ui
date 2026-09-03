import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { CheckboxColumnsExample } from './demos/checkbox.js';

const demoDefinitions = Object.freeze([
  {
    id: 'columns',
    title: '多列布局',
    description: 'vCheckboxes 通过 columns(n) 一行排成 n 列，按钮可动态切换列数。',
    component: CheckboxColumnsExample,
    sourceComponent: CheckboxColumnsExample,
    imports: ['div', 'vText'],
    sourceTitle: 'vCheckboxes 布局使用源码'
  }
]);

export function CheckboxDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-checkbox-docs');
        page.attr('data-component-route-item', 'form:checkbox');

        page.header((header) => {
          header.h1('多选框 vCheckboxes');
          header.p('多选能力集合，默认单列排布；columns(n) 按网格多列布局，可动态调整。');
        });

        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('多个互不排斥的选项需要同时勾选。');
            list.li('选项多时用多列布局压缩纵向空间。');
          });
        });

        page.section((api) => {
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
                  'vCheckboxes({ options, value, columns })',
                  '创建多选组；columns 控制网格列数。',
                  "vCheckboxes({ options, value: ['monitor'], columns: 2 })"
                ],
                [
                  'boxes.options(items)',
                  '设置选项列表。',
                  "boxes.options([{ label: '监控告警', value: 'monitor' }])"
                ],
                ['boxes.columns(n)', '读取或设置列数，即时重排。', 'boxes.columns(3)'],
                ['boxes.value()', '读取选中的 value 数组。', 'boxes.value()']
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
        example.attr('data-checkbox-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.attr('data-checkbox-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
