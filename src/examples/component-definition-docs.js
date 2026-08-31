import { section, vCard, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

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

const componentPatterns = [
  {
    title: '形态 A：薄工厂 —— 函数直接返回 ViewNode',
    intro: '适用于无内部状态、纯配置化组合；函数直接返回 ViewNode，代码量最小。',
    code: `function ServiceTag(options) {
  return vBadge(options);
}`,
    references: ['库内参考：flex / stack / grid / container / spacer / divider、vDynamicLoader。']
  },
  {
    title: '形态 B：对象组件 —— 返回 { render(), ... }',
    intro:
      '适用于常规独立组件（默认形态）。render() 返回 ViewNode，状态保存在闭包或返回对象上，' +
      '可暴露命令/状态方法。',
    code: `function RateCard() {
  const state = { value: 0 };
  return {
    render() {
      return vRate((rate) => {
        rate.value(state.value);
      });
    },
    value(next) {
      state.value = next;
      return this;
    }
  };
}`,
    references: ['库内参考：VPagination（render() + update/change 等状态 API）。']
  }
];

const componentDefinitionDemos = [
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
        page.p('yoya-ui 支持两种组件定义形态，按场景选用：A 薄工厂、B 对象组件。');
        page.p(
          'child() 接受 ViewNode、组件对象（自动包装为 ComponentNode 并缓存 render() 结果）或' +
            '字符串/数字，两种形态均可作为子节点传入页面组合。'
        );
        page.p(
          '子工厂快捷方法（row.button(...)、actions.vButton(...)）返回父节点用于继续追加元素；' +
            '事件绑定使用回调参数：row.button("保存", (btn) => btn.on("click", ...))，' +
            '不要写成 row.button("保存").on("click", ...)。'
        );

        componentPatterns.forEach((pattern) => {
          page.section((block) => {
            block.className('components-guide-section components-definition-pattern');
            block.h3(pattern.title);
            block.p(pattern.intro);
            block.pre((pre) => {
              pre.className('guide-code');
              pre.code(pattern.code);
            });
            block.ul((list) => {
              pattern.references.forEach((reference) => list.li(reference));
            });
          });
        });

        componentDefinitionDemos.forEach((demo) => {
          page.child(ComponentDefinitionDemoSection(demo));
        });
      });
    }
  };
}
