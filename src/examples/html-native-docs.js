import { section, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

function HtmlNativeExample1() {
  const result = vText('原生输入：等待');

  return {
    render() {
      return section((page) => {
        page.className('html-native-demo');
        page.h3('HTML 原生元素');
        page.p('button、input、output 等原生元素可以直接组合，适合底层自由拼装。');
        page.div((box) => {
          box.className('html-native-box');
          box.input((input) => {
            input.id('html-native-name');
            input.attr({ placeholder: '输入名称', type: 'text' });
          });
          box.button((button) => {
            button.className('html-native-button');
            button.text('更新');
            button.on('click', () => {
              const value = document.getElementById('html-native-name')?.value || '';
              result.textContent(`原生输入：${value || '空'}`);
            });
          });
          box.output((output) => output.child(result));
        });
      });
    }
  };
}

const htmlNativeNotes = [
  '原生工厂覆盖 WHATWG 全部 conforming 标签，例如 div、button、input、output、a、table。',
  '遇到 JS 关键字或节点方法冲突时提供别名：style → styleTag、var → varTag。',
  '原生元素提供 attr / styles / text / on / child 等节点方法，适合底层自由拼装。'
];

function HtmlNativeDemoSection() {
  const liveDemo = HtmlNativeExample1();
  const sourcePanel = ComponentSource({
    component: HtmlNativeExample1,
    imports: ['section', 'vText'],
    sourceComponent: HtmlNativeExample1,
    title: 'HTML 原生源码'
  });

  return {
    render() {
      return section((example) => {
        example.className('components-html-native-demo');
        example.h2('实时演示');
        example.div((live) => {
          live.className('components-html-native-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function HtmlNativeDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-html-native-page');
        page.attr('data-html-native-page', 'true');
        page.h1('HTML 原生元素');
        page.p('原生元素可以直接组合，适合底层自由拼装；所有组件最终都建立在原生元素节点之上。');
        page.ul((list) => {
          htmlNativeNotes.forEach((note) => list.li(note));
        });
        page.child(HtmlNativeDemoSection());
      });
    }
  };
}
