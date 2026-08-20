import { createI18n, section, toast, vMessageContainer } from '../../src/index.js';
import { ComponentSource } from './component-source.js';
import { actionsFeedbackCategory } from './demos/actions-feedback.js';
import { asyncDynamicCategory } from './demos/async-dynamic.js';
import { dataDisplayCategory } from './demos/data-display.js';
import { formsDatetimeCategory } from './demos/forms-datetime.js';
import { layoutPageCategory } from './demos/layout-page.js';
import { navigationCategory } from './demos/navigation.js';
import { routingCategory } from './demos/routing.js';

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      actions: {
        danger: '危险操作',
        refresh: '刷新状态',
        save: '保存配置',
        start: '启动任务'
      }
    },
    en: {
      actions: {
        danger: 'Danger',
        refresh: 'Refresh',
        save: 'Save',
        start: 'Start job'
      }
    }
  }
});

export const componentDemoCategories = [
  actionsFeedbackCategory,
  navigationCategory,
  routingCategory,
  asyncDynamicCategory,
  layoutPageCategory,
  dataDisplayCategory,
  formsDatetimeCategory
];

/**
 * 按大类渲染组件示例，每个演示组件与源码面板都通过 child(...) 组合。
 */
export function renderComponentsExample(target = '#app') {
  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  toast.use(messageHost);
  const context = { locale, toast };

  const root = section((page) => {
    page.id('components-demo').className('components-shell');
    page.container((shell) => {
      shell.className('components-container');
      shell.styles({
        boxSizing: 'border-box',
        margin: '0 auto',
        maxWidth: '1120px',
        padding: '0 16px',
        width: '100%'
      });
      shell.header((header) => {
        header.className('components-header');
        header.h1('复合组件');
        header.p('按操作反馈、导航、路由、异步动态、页面布局、数据展示、表单与日期时间浏览组件。');
      });
      shell.nav((navigation) => {
        navigation.className('component-category-navigation');
        navigation.attr('aria-label', '组件大类');
        componentDemoCategories.forEach((category) => {
          navigation.a((link) => {
            link.className('component-category-link');
            link.attr({
              'data-demo-category-link': category.id,
              href: `#category-${category.id}`
            });
            link.strong(category.title);
            link.span(`${category.demos.length} 个演示`);
          });
        });
      });
      shell.vstack((categories) => {
        categories.className('components-examples');
        categories.styles({ gap: '28px', width: '100%' });

        componentDemoCategories.forEach((category) => {
          categories.section((categorySection) => {
            categorySection.id(`category-${category.id}`);
            categorySection.attr('data-demo-category', category.id);
            categorySection.vstack((categoryStack) => {
              categoryStack.style('gap', '18px');
              categoryStack.header((header) => {
                header.className('component-category-header');
                header.h2(category.title);
                header.p(category.description);
              });

              category.demos.forEach(({ component, imports, title }) => {
                categoryStack.grid((example) => {
                  example.className('component-example');
                  example.styles({
                    gap: '12px',
                    gridTemplateColumns: 'minmax(0, 1fr)',
                    width: '100%'
                  });
                  example.child(component(context));
                  example.child(ComponentSource({ component, imports, title }));
                });
              });
            });
          });
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderComponentsExample('#app');
}
