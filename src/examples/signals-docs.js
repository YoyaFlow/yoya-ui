import { signal, computed, effect } from '@preact/signals-core';
import { div, section, vCard, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含 vCardBody 内容与操作方法，不包含 Card 和按钮。
function SignalCounter() {
  const count = signal(0);
  const double = computed(() => count.value * 2);
  const countText = vText('0');
  const doubleText = vText('0');

  effect(() => {
    countText.textContent(String(count.value));
    doubleText.textContent(String(double.value));
  });

  return {
    render() {
      return div((body) => {
        body.div((row) => {
          row.span('当前计数：');
          row.span((el) => el.attr('data-signals-count', 'true').child(countText));
        });
        body.div((row) => {
          row.span('派生值 ×2：');
          row.span((el) => el.attr('data-signals-double', 'true').child(doubleText));
        });
      });
    },
    increment() {
      count.value += 1;
    },
    reset() {
      count.value = 0;
    }
  };
}

function SignalInput() {
  const name = signal('');
  const length = computed(() => name.value.length);
  const format = () => `当前输入：${name.value}，长度：${length.value}`;
  const output = vText(format());

  effect(() => {
    output.textContent(format());
  });

  return {
    render() {
      return div((body) => {
        body.input((field) => {
          field.attr({
            'data-signals-input': 'true',
            placeholder: '输入内容',
            type: 'text'
          });
          field.on('input', (event) => {
            name.value = event.target.value;
          });
        });
        body.div((row) => {
          row.span('输出：');
          row.span((el) => el.attr('data-signals-output', 'true').child(output));
        });
      });
    },
    setValue(text) {
      name.value = text;
    },
    clear() {
      name.value = '';
    }
  };
}

function SignalSharedCounter() {
  const count = signal(0);
  const countText = vText('0');

  effect(() => {
    countText.textContent(String(count.value));
  });

  return {
    render() {
      return div((body) => {
        body.div((row) => {
          row.span('共享计数：');
          row.span((el) => el.attr('data-signals-shared-count', 'true').child(countText));
        });
      });
    },
    increment() {
      count.value += 1;
    },
    reset() {
      count.value = 0;
    }
  };
}

// 页面壳：负责 Card、按钮和说明文字，不进入演示源码面板。
function SignalCounterDemo() {
  const counter = SignalCounter();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('计数器与派生值');
        card.vCardBody((body) => {
          body.p('signal 直接赋值，computed 派生，effect 自动同步视图。');
          body.child(counter);
        });
        card.vCardFooter((footer) => {
          footer.vButton('+1', (button) => {
            button.variant('primary').on('click', () => counter.increment());
          });
          footer.vButton('重置', (button) => {
            button.on('click', () => counter.reset());
          });
        });
      });
    }
  };
}

function SignalInputDemo() {
  const input = SignalInput();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('输入保持焦点');
        card.vCardBody((body) => {
          body.p('输入框只改 signal，输出文本自动更新，输入框 DOM 不被替换。');
          body.child(input);
        });
        card.vCardFooter((footer) => {
          footer.vButton('填入示例', (button) => {
            button.variant('primary').on('click', () => input.setValue('Hello yoya'));
          });
          footer.vButton('清空', (button) => {
            button.on('click', () => input.clear());
          });
        });
      });
    }
  };
}

function SignalSharedDemo() {
  const shared = SignalSharedCounter();

  return {
    render() {
      return div((grid) => {
        grid.className('components-signals-shared-grid');
        grid.child(
          vCard((card) => {
            card.vCardHeader('发送端');
            card.vCardBody((body) => {
              body.p('同一个组件实例挂载在两处，按钮通过操作方法修改共享状态。');
            });
            card.vCardFooter((footer) => {
              footer.vButton('+1', (button) => {
                button.variant('primary').on('click', () => shared.increment());
              });
              footer.vButton('重置', (button) => {
                button.on('click', () => shared.reset());
              });
            });
          }),
          vCard((card) => {
            card.vCardHeader('接收端');
            card.vCardBody((body) => {
              body.child(shared);
            });
          })
        );
      });
    }
  };
}

const signalsDemos = [
  {
    id: 'counter',
    live: SignalCounterDemo,
    component: SignalCounter,
    imports: [
      { from: '@preact/signals-core', names: ['signal', 'computed', 'effect'] },
      { from: 'yoya-ui', names: ['div', 'vText'] }
    ],
    sourceTitle: '计数器核心源码',
    title: '计数器与派生值'
  },
  {
    id: 'input',
    live: SignalInputDemo,
    component: SignalInput,
    imports: [
      { from: '@preact/signals-core', names: ['signal', 'computed', 'effect'] },
      { from: 'yoya-ui', names: ['div', 'vText'] }
    ],
    sourceTitle: '输入核心源码',
    title: '输入保持焦点'
  },
  {
    id: 'shared',
    live: SignalSharedDemo,
    component: SignalSharedCounter,
    imports: [
      { from: '@preact/signals-core', names: ['signal', 'effect'] },
      { from: 'yoya-ui', names: ['div', 'vText'] }
    ],
    sourceTitle: '共享状态核心源码',
    title: '跨组件共享状态'
  }
];

function SignalsDemoSection(demo) {
  const liveDemo = demo.live();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-signals-demo');
        example.attr('data-signals-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-signals-demo-live');
          live.attr('data-signals-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function SignalsDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-signals-page');
        page.attr('data-signals-page', 'true');
        page.h1('Signals 状态管理');
        page.p(
          '基于 @preact/signals-core 的第三方状态管理扩展：signal 保存状态，computed 派生，effect 同步视图，不依赖 vStateNode。'
        );
        page.section((usage) => {
          usage.className('components-signals-usage');
          usage.attr('data-signals-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要数据状态与派生视图自动同步（摘要、联动提示、输出文本）。');
            list.li('需要跨组件共享同一份状态，避免回调层层传递。');
            list.li('不想手写 update 或手动同步 DOM，希望一次赋值自动更新。');
            list.li('输入类交互要保持焦点：只更新派生节点，不重建输入框。');
          });
        });
        page.section((advantages) => {
          advantages.className('components-signals-advantages');
          advantages.attr('data-signals-advantages', 'true');
          advantages.h2('用法优点');
          advantages.ul((list) => {
            list.li('一次赋值，数据与视图同步完成，避免操作两次。');
            list.li('computed 声明式派生，自动随源状态更新。');
            list.li('依赖追踪自动圈定更新范围，细粒度更新避免整树重绘、不丢焦点。');
            list.li('signal 可在组件外定义，天然支持跨组件共享，无需 store。');
            list.li('与 vStateNode 互补：结构切换用 vStateNode，派生展示与共享状态用 Signals。');
          });
        });
        page.div((grid) => {
          grid.className('components-signals-grid');
          grid.attr('data-signals-grid', 'true');
          signalsDemos.forEach((demo) => {
            grid.child(SignalsDemoSection(demo));
          });
        });
      });
    }
  };
}
