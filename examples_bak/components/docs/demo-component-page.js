import { section, vButton } from '../../../src/index.js';
import { ComponentSource } from '../component-source.js';
import { findComponentEntry } from './demo-registry.js';
import {
  DemoApiTable,
  DemoBoundaryList,
  DemoBreadcrumb,
  DemoSection,
  DemoTagList
} from './demo-ui.js';

function componentPath(entry) {
  return `/${entry.categoryId}/${entry.id}`;
}

export function DemoComponentPage({ context, entry, navigate } = {}) {
  const sourcePanel = ComponentSource({
    component: entry.component,
    imports: entry.imports,
    title: entry.sourceTitle
  });
  const go = typeof navigate === 'function' ? navigate : () => {};

  return {
    render() {
      return section((page) => {
        page.className('components-detail-page');
        page.attr('data-demo-component-page', entry.id);

        page.vstack((stack) => {
          stack.style('gap', '18px');

          stack.child(
            DemoBreadcrumb({
              items: [
                { label: '组件目录', to: '/' },
                { label: entry.categoryTitle, to: `/${entry.categoryId}` },
                { label: entry.title }
              ],
              routerInstance: context?.routerInstance
            })
          );

          stack.header((header) => {
            header.className('component-category-header');
            header.h2(entry.title);
            header.p(entry.description || entry.summary || '');
            header.span(entry.sourceFile);
            header.child(
              DemoTagList({ tags: [entry.categoryTitle, entry.status, entry.componentLabel] })
            );
          });

          stack.grid((layout) => {
            layout.className('demo-detail-layout');
            layout.styles({
              gap: '16px',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)'
            });

            layout.section((live) => {
              live.className('demo-live-panel');
              live.attr('data-demo-live', 'true');
              live.h3('实时演示');
              live.child(entry.component(context));
            });

            layout.child(sourcePanel);
          });

          stack.child(
            DemoSection({
              children: DemoApiTable({ rows: entry.api }),
              className: 'demo-detail-section',
              dataAttr: 'data-demo-api-table',
              headingTag: 'h3',
              title: 'API'
            })
          );

          stack.child(
            DemoSection({
              children:
                (entry.behavior ?? []).length === 0
                  ? section((view) => {
                      view.p('暂无行为说明。');
                    })
                  : section((list) => {
                      list.ul((items) => {
                        entry.behavior.forEach((item) => items.li(item));
                      });
                    }),
              className: 'demo-detail-section',
              dataAttr: 'data-demo-behavior',
              headingTag: 'h3',
              title: '行为'
            })
          );

          stack.child(
            DemoSection({
              children: DemoBoundaryList({ boundaries: entry.boundaries }),
              className: 'demo-detail-section',
              dataAttr: 'data-demo-boundaries',
              headingTag: 'h3',
              title: '边界'
            })
          );

          stack.child(
            DemoSection({
              children: (() => {
                const relatedEntries = (entry.related ?? [])
                  .map((relatedId) => findComponentEntry(relatedId))
                  .filter(Boolean);

                if (relatedEntries.length === 0) {
                  return section((view) => {
                    view.p('暂无关联组件。');
                  });
                }

                return section((view) => {
                  view.className('demo-tag-list');
                  relatedEntries.forEach((relatedEntry) => {
                    view.child(
                      vButton((button) => {
                        button.label(relatedEntry.title);
                        button.variant('secondary');
                        button.on('click', () => go(componentPath(relatedEntry)));
                      })
                    );
                  });
                });
              })(),
              className: 'demo-detail-section',
              headingTag: 'h3',
              title: '关联'
            })
          );
        });
      });
    }
  };
}
