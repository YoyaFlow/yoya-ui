import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import { WhenFailedComponentExample, WhenFailedReportExample } from './demos/when-failed.js';

const errorDemos = [
  {
    component: WhenFailedReportExample,
    description:
      'handler 返回 null：只上报不替换结构。每次捕获都会 console.error（含原始堆栈），业务侧可用信号统计或上报。',
    id: 'report',
    imports: ['computed', 'div', 'ref', 'vstack'],
    sourceTitle: '报告模式源码',
    title: '报告模式：返回 null 保现状'
  },
  {
    component: WhenFailedComponentExample,
    description:
      '组件对象定义与 render() 同层的 whenFailed 成员，ComponentNode 自动挂载；返回节点则替换组件输出为降级 UI。',
    id: 'component',
    imports: ['div', 'ref', 'span', 'vstack'],
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
          list.li('嵌套边界内层接管即止步；返回空继续向外；handler 自身抛错交由外层处理。');
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
