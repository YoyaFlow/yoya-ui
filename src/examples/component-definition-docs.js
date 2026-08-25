import { section, vCard, vText } from '../index.js';
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

function DefineComponentExample1() {
  const status = vText('待发布');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('定义一个组件');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('组件是参数函数 + render() 对象，最后返回 ViewNode。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('状态');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', gap: '10px' });
            actions.vButton((button) => {
              button.label('发布');
              button.variant('primary');
              button.on('click', () => status.textContent('已发布'));
            });
          });
        });
      });
    }
  };
}

function ComposeComponentExample1() {
  const MemberCard = ({ name, role, status }) => {
    return {
      render() {
        return vCard((card) => {
          card.vCardBody((body) => {
            body.hstack((row) => {
              row.style({ alignItems: 'center', gap: '12px' });
              row.vAvatar({ text: name.slice(0, 1) });
              row.vstack((info) => {
                info.style('gap', '2px');
                info.strong(name);
                info.span(role);
              });
              row.spacer();
              row.vBadge({ status, text: status });
            });
          });
        });
      }
    };
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('组合多个组件');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('通过 child() 把多个子组件组合成一个完整卡片。');
            content.grid((grid) => {
              grid.style('gap', '10px');
              grid.child(
                MemberCard({ name: 'Alice', role: '前端', status: 'success' }),
                MemberCard({ name: 'Bob', role: '后端', status: 'processing' }),
                MemberCard({ name: 'Cara', role: '运维', status: 'warning' })
              );
            });
          });
        });
      });
    }
  };
}

function InteractiveComposeExample1() {
  const parentLog = vText('等待子组件回调');
  const WizardChild = ({ onCancel, onFinish, title }) => {
    let step = 1;
    const status = vText('第 1 步');

    const update = (nextStep) => {
      step = nextStep;
      status.textContent(`第 ${step} 步`);
    };

    return {
      next() {
        if (step < 3) {
          update(step + 1);
        } else {
          onFinish?.(step);
        }
      },
      prev() {
        if (step > 1) {
          update(step - 1);
        } else {
          onCancel?.(step);
        }
      },
      reset() {
        update(1);
      },
      setStep(value) {
        update(Math.min(3, Math.max(1, value)));
      },
      step() {
        return step;
      },
      render() {
        return section((panel) => {
          panel.className('wizard-child-panel');
          panel.strong(title);
          panel.p(status);
          panel.hstack((actions) => {
            actions.style({ alignItems: 'center', gap: '10px' });
            actions.vButton('上一步', (btn) => btn.size('small').on('click', () => this.prev()));
            actions.vButton('下一步', (btn) =>
              btn
                .size('small')
                .variant('primary')
                .on('click', () => this.next())
            );
          });
        });
      }
    };
  };

  const child = WizardChild({
    onCancel(step) {
      parentLog.textContent(`父组件收到：取消第 ${step} 步`);
    },
    onFinish(step) {
      parentLog.textContent(`父组件收到：第 ${step} 步完成`);
    },
    title: '部署向导'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('组合组件交互');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('父组件通过参数传入回调，子组件把方法暴露给父组件调用。');
            content.child(child);
            content.hstack((actions) => {
              actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
              actions.vButton('父组件调用下一步', (btn) => btn.on('click', () => child.next()));
              actions.vButton('父组件调用上一步', (btn) => btn.on('click', () => child.prev()));
              actions.vButton('父组件重置', (btn) => btn.on('click', () => child.reset()));
              actions.vButton('父组件跳转第 3 步', (btn) =>
                btn.on('click', () => child.setStep(3))
              );
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('父组件接收');
              row.spacer();
              row.output((output) => {
                output.attr('data-parent-log', 'true');
                output.child(parentLog);
              });
            });
          });
        });
      });
    }
  };
}

const componentDefinitionDemos = [
  {
    component: HtmlNativeExample1,
    id: 'html-native',
    imports: ['section', 'vText'],
    sourceTitle: 'HTML 原生源码',
    title: 'HTML 原生元素'
  },
  {
    component: DefineComponentExample1,
    id: 'define',
    imports: ['vButton', 'vCard', 'vText'],
    sourceTitle: '定义组件源码',
    title: '定义一个组件'
  },
  {
    component: ComposeComponentExample1,
    id: 'compose',
    imports: ['vAvatar', 'vBadge', 'vCard'],
    sourceTitle: '组合组件源码',
    title: '组合多个组件'
  },
  {
    component: InteractiveComposeExample1,
    id: 'interactive-compose',
    imports: ['section', 'vCard', 'vText'],
    sourceTitle: '组合组件交互源码',
    title: '组合组件交互'
  }
];

function ComponentDefinitionDemoSection(demo) {
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
        example.className('components-definition-demo');
        example.attr('data-definition-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-definition-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function ComponentDefinitionDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-definition-page');
        page.attr('data-definition-page', 'true');
        page.h1('定义组件');
        page.p('使用参数函数 + render() 定义组件，并通过 child() 组合多个组件。');

        componentDefinitionDemos.forEach((demo) => {
          page.child(ComponentDefinitionDemoSection(demo));
        });
      });
    }
  };
}
