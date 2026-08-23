import { replaceChildren } from '../../../src/components/shared.js';
import { section, vCard } from '../../../src/index.js';
import { filterComponentEntries } from './demo-registry.js';
import {
  DemoMetricCard,
  DemoScenarioCard,
  DemoSearchBox,
  DemoSourceSummary,
  DemoTagList
} from './demo-ui.js';

function categoryPath(categoryId) {
  return `/${categoryId}`;
}

function componentCount(registry) {
  return registry.components.length;
}

function demoCount(registry) {
  return (registry.demos ?? registry.components).length;
}

function sourceCount(registry) {
  return (registry.sources ?? []).length;
}

function createCategoryCard(category, navigate) {
  return vCard((card) => {
    card.className('demo-category-card');
    card.attr('data-demo-category-card', category.id);
    card.h3(category.title);
    card.p(category.description);
    card.div((meta) => {
      meta.className('demo-category-card-meta');
      meta.span(`${category.components.length} 个组件`);
      meta.span(`${category.demos.length} 个演示场景`);
      meta.span(category.sourceDir);
    });
    card.child(DemoTagList({ tags: category.boundary.owns.slice(0, 3) }));
    card.vButton((button) => {
      button.label('查看分类概览');
      button.variant('primary');
      button.on('click', () => navigate(categoryPath(category.id)));
    });
  });
}

function createEmptyState(title, text) {
  return vCard((card) => {
    card.className('demo-empty-state');
    card.h3(title);
    card.p(text);
  });
}

export function DemoHomePage({ navigate, registry, searchState } = {}) {
  const state = searchState ?? { query: '' };
  const go = typeof navigate === 'function' ? navigate : () => {};
  let resultsHost = null;

  const renderResults = (query) => {
    if (!resultsHost) {
      return;
    }

    const normalized = String(query ?? '').trim();
    const matches = filterComponentEntries(normalized);

    if (matches.length === 0) {
      replaceChildren(resultsHost, [
        createEmptyState('没有匹配结果', '试试输入组件名、演示场景、分类、关键词或源码文件名。')
      ]);
      return;
    }

    const entries = normalized ? matches : matches.slice(0, 6);
    replaceChildren(
      resultsHost,
      entries.map((entry) => DemoScenarioCard({ entry, navigate: go }))
    );
  };

  return {
    render() {
      return section((page) => {
        page.className('components-home');
        page.attr('data-demo-home', 'true');

        page.header((header) => {
          header.className('components-home-header');
          header.h2('组件目录');
          header.p(
            `${registry.categories.length} 个分类，${componentCount(registry)} 个组件，${demoCount(
              registry
            )} 个演示场景，${sourceCount(registry)} 个源码文件。`
          );
        });

        page.child(
          DemoSearchBox({
            onInput(value) {
              state.query = value;
              renderResults(state.query);
            },
            value: state.query
          })
        );

        page.grid((stats) => {
          stats.className('components-home-stats');
          stats.styles({
            gap: '12px',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
          });
          stats.child(
            DemoMetricCard({
              label: '分类',
              note: '按能力边界组织',
              value: registry.categories.length
            })
          );
          stats.child(
            DemoMetricCard({
              label: '组件',
              note: '目录中的实际组件',
              value: componentCount(registry)
            })
          );
          stats.child(
            DemoMetricCard({
              label: '演示场景',
              note: '可打开完整组件文档',
              value: demoCount(registry)
            })
          );
          stats.child(
            DemoMetricCard({
              label: '源码文件',
              note: '按示例模块去重',
              value: sourceCount(registry)
            })
          );
        });

        page.section((results) => {
          results.className('components-home-results');
          results.h2('演示场景');
          results.div((host) => {
            host.className('demo-home-results-grid');
            resultsHost = host;
            renderResults(state.query);
          });
        });

        page.section((catalog) => {
          catalog.className('components-home-catalog');
          catalog.h2('按分类浏览');
          catalog.div((cards) => {
            cards.className('demo-category-card-grid');
            registry.categories.forEach((category) => {
              cards.child(createCategoryCard(category, go));
            });
          });
        });

        page.section((sources) => {
          sources.className('components-home-sources');
          sources.attr('data-demo-source-index', 'true');
          sources.h2('按源码文件浏览');
          sources.div((cards) => {
            cards.className('demo-source-summary-grid');
            (registry.sources ?? []).forEach((source) => {
              cards.child(DemoSourceSummary({ source }));
            });
          });
        });
      });
    }
  };
}
