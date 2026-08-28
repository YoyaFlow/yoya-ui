import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { renderThemeDemo } from './theme-demo.js';

/**
 * 主题切换演示页：明暗模式、紧凑密度、品牌主色覆盖。
 */
export function ThemeDemonstrationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-theme-docs');
        page.attr({
          'data-component-route-item': 'theme:0',
          'data-theme-docs': 'playground'
        });

        page.div((header) => {
          header.className('components-route-header');
          header.h2('主题切换');
          header.p('主题');
          header.p('明暗模式 / 紧凑密度 / 品牌主色（--yoya-raw-primary）覆盖。');
        });

        page.div((layout) => {
          layout.className('components-route-layout');
          layout.attr('data-demo-flow', 'content-source');

          layout.section((live) => {
            live.className('components-route-live');
            live.h3('实时演示');
            live.child(renderThemeDemo());
          });

          layout.child(
            ComponentSource({
              component: renderThemeDemo,
              sourceComponent: renderThemeDemo,
              imports: ['div', 'input', 'vButton', 'vCard', 'vText', 'vThemeModeSwitch'],
              title: '主题切换演示源码'
            })
          );
        });
      });
    }
  };
}
