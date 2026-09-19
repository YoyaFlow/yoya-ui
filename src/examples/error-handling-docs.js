import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { WhenFailedComponentExample, WhenFailedReportExample } from './demos/when-failed.js';

const errorDemos = [
  {
    component: WhenFailedReportExample,
    description:
      'handler 返回 null：只上报不替换结构。每次捕获都会 console.error（含原始堆栈），业务侧可用信号统计或上报。',
    id: 'report',
    imports: ['computed', 'ref', 'vstack'],
    sourceTitle: '报告模式源码',
    title: '报告模式：返回 null 保现状'
  },
  {
    component: WhenFailedComponentExample,
    description:
      'vNode 产物就是节点，可直接写在树里；边界写 api.whenFailed（等价 node.whenFailed）。触发/恢复按钮都在边界外：降级只替换组件自身输出，恢复靠父级区域重建拿到新实例，所以能反复观察。',
    id: 'component',
    imports: ['div', 'ref', 'span', 'vNode', 'vstack'],
    sourceTitle: '组件协议降级源码',
    title: '组件协议：自带降级'
  }
];

export function ErrorHandlingDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-error-handling-page');
        page.attr('data-error-page', 'true');
        page.h1('错误处理');
        page.p(
          'whenFailed(handler) 声明子树错误边界：返回节点替换子树降级，返回 null 仅上报并保持现状。'
        );
        page.ul((list) => {
          list.li(
            '双入口：节点方法就地圈界；组件对象写与 render() 同层的 whenFailed 成员，自动挂载。'
          );
          list.li(
            '捕获永不静默：console.error 必发（含原始 error 对象），devtools 开启时追加 error 事件。'
          );
          list.li(
            '错误向上找最近的边界，由它独占捕获、不再向外；handler 返回空则仅上报并保持现状。'
          );
          list.li('无边界时错误原样传播（fail fast）；区域更新失败仍先回滚保旧，再交给边界决定。');
        });
        errorDemos.forEach((demo) => page.child(ErrorDemoSection(demo)));
      });
    }
  };
}

function ErrorDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-error-demo');
        example.attr('data-error-demo', demo.id);
        example.h2(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-error-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
