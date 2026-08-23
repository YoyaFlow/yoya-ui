import { section } from '../../../src/index.js';
import { DemoBoundarySummary, DemoMetricCard, DemoScenarioCard, DemoTagList } from './demo-ui.js';

function sourceCount(category) {
  return new Set(category.demos.map((entry) => entry.sourceFile)).size;
}

export function DemoCategoryPage({ category, navigate } = {}) {
  const go = typeof navigate === 'function' ? navigate : () => {};

  return {
    render() {
      return section((page) => {
        page.className('components-category-page');
        page.attr('data-demo-category', category.id);

        page.vstack((stack) => {
          stack.style('gap', '18px');

          stack.header((header) => {
            header.className('component-category-header');
            header.h2(category.title);
            header.p(category.description);
            header.span(category.sourceDir);
            header.child(DemoTagList({ tags: category.boundary.owns }));
          });

          stack.grid((stats) => {
            stats.className('components-home-stats');
            stats.styles({
              gap: '12px',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
            });
            stats.child(
              DemoMetricCard({
                label: '组件',
                note: '分类覆盖的实际组件',
                value: category.components.length
              })
            );
            stats.child(
              DemoMetricCard({
                label: '演示场景',
                note: '可打开完整组件文档',
                value: category.demos.length
              })
            );
            stats.child(
              DemoMetricCard({
                label: '源码文件',
                note: '该分类使用的示例模块',
                value: sourceCount(category)
              })
            );
          });

          stack.child(DemoBoundarySummary({ boundary: category.boundary }));

          stack.section((scenarios) => {
            scenarios.className('demo-category-scenarios');
            scenarios.h3('演示场景');
            scenarios.div((cards) => {
              cards.className('demo-scenario-card-grid');
              category.demos.forEach((entry) => {
                cards.child(DemoScenarioCard({ entry, navigate: go }));
              });
            });
          });
        });
      });
    }
  };
}
