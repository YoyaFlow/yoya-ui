import { section, vCard, vLink } from '../../../src/index.js';

export function DemoSection({
  children = null,
  className = '',
  dataAttr = '',
  dataValue = 'true',
  description = '',
  headingTag = 'h2',
  title = ''
} = {}) {
  return {
    render() {
      return section((node) => {
        node.className('demo-section');
        if (className) {
          node.className(className);
        }
        if (dataAttr) {
          node.attr(dataAttr, dataValue);
        }
        if (title) {
          const heading = typeof node[headingTag] === 'function' ? node[headingTag] : node.h2;
          heading.call(node, title);
        }
        if (description) {
          node.p(description);
        }
        if (children !== null && children !== undefined) {
          node.child(children);
        }
      });
    }
  };
}

export function DemoMetricCard({ label, note = '', value } = {}) {
  return {
    render() {
      return vCard((card) => {
        card.className('demo-metric-card');
        card.strong(String(value ?? ''));
        card.span(label);
        if (note) {
          card.p(note);
        }
      });
    }
  };
}

export function DemoTagList({ className = 'demo-tag-list', tags = [] } = {}) {
  return {
    render() {
      return section((list) => {
        list.className(className);
        tags.filter(Boolean).forEach((tag) => {
          list.span((span) => {
            span.className('demo-tag');
            span.child(tag);
          });
        });
      });
    }
  };
}

export function DemoBoundaryList({ boundaries } = {}) {
  return {
    render() {
      return section((view) => {
        view.className('demo-boundary-grid');
        [
          ['负责', boundaries?.owns ?? []],
          ['不负责', boundaries?.doesNotOwn ?? []],
          ['关联', boundaries?.related ?? []]
        ].forEach(([title, items]) => {
          view.article((card) => {
            card.className('demo-boundary-card');
            card.h3(title);
            if (items.length === 0) {
              card.p('暂无');
              return;
            }
            card.ul((list) => {
              items.forEach((item) => list.li(item));
            });
          });
        });
      });
    }
  };
}

export function DemoBoundarySummary({ boundary } = {}) {
  return {
    render() {
      return section((view) => {
        view.className('demo-category-boundary');
        [
          ['负责', boundary?.owns ?? []],
          ['不负责', boundary?.doesNotOwn ?? []]
        ].forEach(([title, items]) => {
          view.article((card) => {
            card.className('demo-category-boundary-card');
            card.h3(title);
            card.p(items.length > 0 ? items.join('、') : '暂无');
          });
        });
      });
    }
  };
}

export function DemoBreadcrumb({ routerInstance, items = [] } = {}) {
  return {
    render() {
      return section((view) => {
        view.className('demo-breadcrumb');
        view.attr('data-demo-breadcrumb', 'true');
        items.forEach((item, index) => {
          if (index > 0) {
            view.span(' / ');
          }
          if (item.to && routerInstance) {
            view.child(vLink(routerInstance, { label: item.label, to: item.to }));
            return;
          }
          view.span(item.label);
        });
      });
    }
  };
}

export function DemoScenarioCard({ entry, navigate } = {}) {
  const go = typeof navigate === 'function' ? navigate : () => {};

  return {
    render() {
      return vCard((card) => {
        card.className('demo-scenario-card');
        card.attr('data-demo-scenario-card', entry.id);
        card.h3(entry.title);
        card.p(entry.summary || entry.description || '');
        card.div((meta) => {
          meta.className('demo-scenario-meta');
          meta.span(entry.categoryTitle);
          meta.span(entry.componentLabel || entry.title);
          meta.span(entry.sourceFile);
        });
        card.vButton((button) => {
          button.attr('data-demo-scenario-link', entry.id);
          button.label('打开完整文档');
          button.variant('secondary');
          button.on('click', () => go(`/${entry.categoryId}/${entry.id}`));
        });
      });
    }
  };
}

export function DemoSourceSummary({ source } = {}) {
  return {
    render() {
      return vCard((card) => {
        card.className('demo-source-summary');
        card.attr('data-demo-source-summary', source.file);
        card.h3(source.file.split('/').pop());
        card.p(source.sourceDir);
        card.div((meta) => {
          meta.className('demo-source-summary-meta');
          meta.span(source.categoryTitle);
          meta.span(`${source.demoCount} 个演示场景`);
        });
      });
    }
  };
}

export function DemoApiTable({ rows = [] } = {}) {
  return {
    render() {
      return section((view) => {
        view.className('demo-api-table');
        view.table((tableNode) => {
          tableNode.className('demo-api-table-inner');
          tableNode.thead((head) => {
            head.tr((row) => {
              ['方法/选项', '类型', '默认', '说明', '边界'].forEach((title) => {
                row.th(title);
              });
            });
          });
          tableNode.tbody((body) => {
            if (rows.length === 0) {
              body.tr((row) => {
                row.td((cell) => {
                  cell.attr('colspan', '5');
                  cell.text('暂无公开 API。');
                });
              });
              return;
            }

            rows.forEach(([method, type, defaultValue, description, note]) => {
              body.tr((row) => {
                row.td(method);
                row.td(type);
                row.td(defaultValue);
                row.td(description);
                row.td(note);
              });
            });
          });
        });
      });
    }
  };
}

export function DemoSearchBox({
  onInput,
  placeholder = '搜索组件、演示场景、分类、关键词或源码文件',
  value = ''
} = {}) {
  return {
    render() {
      return section((search) => {
        search.className('demo-search-row');
        search.vInput((input) => {
          input.attr('data-demo-search', 'true');
          input.placeholder(placeholder);
          input.type('search');
          input.value(value);
          input.on('input', (event) => {
            if (typeof onInput === 'function') {
              onInput(event.target.value);
            }
          });
        });
        search.p('结果会同步显示匹配的演示场景，并标注所属分类和源码文件。');
      });
    }
  };
}
