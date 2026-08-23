import { section, toast, vMessageContainer } from '../../src/index.js';
import { ComponentSource } from '../components/component-source.js';
import { navigationCategory } from '../components/demos/navigation.js';

export const menuDemoComponents = navigationCategory.demos;

/**
 * 独立渲染菜单组件，方便集中测试菜单结构、嵌套与浮层交互。
 */
export function renderMenusExample(target = '#app') {
  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  toast.use(messageHost);
  const context = { toast };

  const root = section((page) => {
    page.id('menus-demo').className('menus-shell');
    page.container((shell) => {
      shell.className('menus-container');
      shell.header((header) => {
        header.className('menus-header');
        header.a((link) => link.attr('href', '../components/').text('← 返回组件总览'));
        header.h1('菜单组件');
        header.p('集中测试命令菜单、分组与分隔线、嵌套菜单、下拉菜单和上下文菜单。');
      });
      shell.vstack((examples) => {
        examples.className('menus-examples');
        examples.style('gap', '28px');

        menuDemoComponents.forEach(({ component, imports, title }) => {
          examples.section((example) => {
            example.className('menu-example');
            example.attr('data-menu-example', component.name);
            example.section((preview) => {
              preview.className('menu-example-preview');
              preview.attr('data-menu-preview', component.name);
              preview.child(component(context));
            });
            example.child(ComponentSource({ component, imports, title }));
          });
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderMenusExample('#app');
}
