import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { ConfirmExample } from './demos/vconfirm.js';

const demoDefinitions = Object.freeze([
  {
    id: 'basic',
    title: '确认弹窗',
    description: '命令式确认操作，支持 danger 与异步确认。',
    component: ConfirmExample,
    sourceComponent: ConfirmExample,
    imports: ['div', 'vConfirm'],
    sourceTitle: 'vConfirm 使用源码'
  }
]);

export function ConfirmDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-vconfirm-docs');
        page.attr('data-component-route-item', 'guides:confirm');
        page.header((header) => {
          header.h1('确认弹窗 vConfirm');
          header.p('一行开启危险操作确认，返回 Promise，SSR 安全。');
        });
        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('删除、覆盖等不可撤销操作。');
            list.li('需要统一确认交互与键盘 Escape 关闭。');
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
        example.attr('data-vconfirm-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.attr('data-vconfirm-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
