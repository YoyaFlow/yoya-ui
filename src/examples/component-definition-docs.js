import { section, vCard, vText } from '../index.js';
import { ComponentSource } from './component-source.js';
import { ComplexWorkbenchExample, complexBlocksSource } from './demos/definition-complex.js';

function DefineComponentExample1() {
  const status = vText('待发布');

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
        actions.vButton('发布', (button) => {
          button.variant('primary');
          button.on('click', () => status.textContent('已发布'));
        });
      });
    });
  });
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
            actions.vButton('上一步', (btn) => {
              btn.size('small').on('click', () => this.prev());
            });
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
          actions.vButton('父组件跳转第 3 步', (btn) => btn.on('click', () => child.setStep(3)));
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

const componentPatterns = [
  {
    title: '形态 A：薄工厂 —— 函数直接返回 ViewNode',
    intro:
      '确定这个组件没有额外行为要定义（没有内部状态、没有对外命令方法、没有生命周期诉求）时就用它：' +
      '函数直接返回 ViewNode，代码量最小。不要为了「以后可能要用」先包一层，' +
      '真有状态或命令方法时再升级到形态 B（vNode）。演示代码同样按这个判据：只演示结构与交互、' +
      '没有对外命令方法时直接返回节点。',
    code: `function ServiceTag(options) {
  return vBadge(options);
}`,
    references: ['库内参考：flex / stack / grid / container / spacer / divider、vDynamicLoader。']
  },
  {
    title: '形态 B：vNode —— 有行为就用它',
    intro:
      '适用于确有内部状态、对外命令方法或生命周期诉求的组件：状态放闭包，命令与钩子写在 api 上，' +
      '视图由 setup 返回 —— 定义即得到组件节点（ComponentNode）。命令里 return api 等于返回节点，' +
      '自带边界写 api.whenFailed；命名撞上节点 API（child / destroy / renderDom …）会直接报错。',
    code: `function CounterCard() {
  const count = ref(0);
  return vNode((api) => {
    api.bump = () => {
      count.value += 1;
      return api; // 等价于返回节点
    };
    return vstack((stack) => {
      stack.vOutput((out) => out.child(vText(computed(() => \`计数 \${count.value}\`))));
      stack.vButton('+1', (button) => button.on('click', () => api.bump()));
    });
  });
}`,
    references: [
      '组件只有这两种形态：对象组件（返回 { render(), ... }）已退场，class 继承节点是引擎内部的节点类型扩展，不是组件写法。'
    ]
  },
  {
    title: '节点类型扩展（引擎内部，不是第三种组件形态）',
    intro:
      '需要元素级行为（重写 renderDom / toHTML / child 语义、DOM 测量、事件绑定、生命周期）时，' +
      '视图根本身得是一个节点类型：class XxxNode extends HtmlElementNode。库内组件都这么做，' +
      '但对外只有一个句柄（vNode 组件节点），节点类型不进包入口，第三方与业务组件都不需要继承。',
    code: `// 库内：不导出的节点类型 + 公开的 vNode 外壳
class BadgeNode extends HtmlElementNode {
  // 元素机制：renderDom / child 语义 / 测量 / 生命周期
}

export function vBadge(first = null, second = null, third = null) {
  return createComponentShell({ identity: 'VBadge', createNode: (setup) => new BadgeNode(setup) });
}`,
    references: ['只有"自定义元素种类"这类引擎扩展才写节点类型；业务组件用 A 或 B。']
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
  },
  {
    component: ComplexWorkbenchExample,
    extraSource: complexBlocksSource,
    id: 'complex-blocks',
    imports: ['computed', 'hstack', 'input', 'li', 'ref', 'ul', 'vText', 'vstack'],
    sourceTitle: '复杂组件分块源码',
    title: '复杂组件：结构块也是组件'
  }
];

function ComponentDefinitionDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    extraSource: demo.extraSource,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

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

export function ComponentDefinitionDocumentationPage() {
  return section((page) => {
    page.className('components-route-page components-definition-page');
    page.attr('data-definition-page', 'true');
    page.h1('定义组件');
    page.p('组件的四个阶段（声明 / 挂载 / 更新 / 销毁）见「开发指南 → 组件生命周期」。');
    page.p(
      'yoya-ui 支持两种组件定义形态，按场景选用：没有额外行为要定义就用 A 薄工厂，' +
        '有内部状态或对外命令方法才用 B 对象组件。'
    );
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
