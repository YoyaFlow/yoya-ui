import { div, section, vButtons, vCard, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含按钮组内容，不包含 Card。
function ButtonGroupBasicExample() {
  return vButtons({
    options: ['复制', '粘贴', '剪切'],
    size: 'medium'
  });
}

function ButtonGroupSelectExample() {
  const output = vText('all');
  const group = vButtons((group) => {
    group.selectable(true);
    group.value('all');
    group.options([
      { label: '全部', value: 'all' },
      { label: '运行中', value: 'running' },
      { label: '已停止', value: 'stopped' }
    ]);
    group.change((next) => {
      output.textContent(next);
    });
  });

  return {
    render() {
      return div((body) => {
        body.child(group);
        body.div((row) => {
          row.span('当前筛选');
          row.spacer();
          row.output((el) => el.attr('data-button-group-output', 'true').child(output));
        });
      });
    }
  };
}

function ButtonGroupJoinedExample() {
  const output = vText('list');
  const group = vButtons((group) => {
    group.joined(true);
    group.selectable(true);
    group.value('list');
    group.options([
      { label: '列表', value: 'list' },
      { label: '卡片', value: 'card' },
      { label: '看板', value: 'board' }
    ]);
    group.change((next) => {
      output.textContent(next);
    });
  });

  return {
    render() {
      return div((body) => {
        body.child(group);
        body.div((row) => {
          row.span('当前视图');
          row.spacer();
          row.output((el) => el.attr('data-button-group-joined-output', 'true').child(output));
        });
      });
    }
  };
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function ButtonGroupBasicDemo() {
  const content = ButtonGroupBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础分组');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('options 配置式创建按钮，variant / size 统一默认外观。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function ButtonGroupSelectDemo() {
  const content = ButtonGroupSelectExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('单选分组');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('selectable 开启后，点击按钮切换选中项并触发 change。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function ButtonGroupJoinedDemo() {
  const content = ButtonGroupJoinedExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('拼接形态');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('joined 让按钮首尾相连、共享边框，像分段控件一样突出选中项。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const buttonGroupDemos = [
  {
    id: 'basic',
    title: '基础分组',
    component: ButtonGroupBasicDemo,
    sourceComponent: ButtonGroupBasicExample,
    imports: ['vButtons'],
    sourceTitle: '基础分组源码'
  },
  {
    id: 'select',
    title: '单选分组',
    component: ButtonGroupSelectDemo,
    sourceComponent: ButtonGroupSelectExample,
    imports: ['div', 'vButtons', 'vText'],
    sourceTitle: '单选分组源码'
  },
  {
    id: 'joined',
    title: '拼接形态',
    component: ButtonGroupJoinedDemo,
    sourceComponent: ButtonGroupJoinedExample,
    imports: ['div', 'vButtons', 'vText'],
    sourceTitle: '拼接形态源码'
  }
];

function ButtonGroupDemoSection(demo) {
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
        example.className('components-button-group-demo');
        example.attr('data-button-group-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-button-group-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function ButtonGroupDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-button-group-docs');
        page.attr('data-component-route-item', 'general:button-group');
        page.attr('data-button-group-docs', 'true');
        page.h1('vButtons 按钮组');
        page.p('把多个按钮收敛到同一容器，支持配置式创建和单选联动。');

        page.section((usage) => {
          usage.className('components-button-group-usage');
          usage.attr('data-button-group-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('多个同类操作需要视觉上分组时（工具栏、筛选条件）。');
            list.li('互斥选项需要单选高亮并回调当前值时。');
          });
        });

        page.section((api) => {
          api.className('components-button-group-api');
          api.attr('data-button-group-api', 'true');
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              [
                [
                  'vButtons({ options, variant, size })',
                  '创建按钮组。',
                  "vButtons({ options: ['复制', '粘贴'] })"
                ],
                [
                  'group.options(items)',
                  '配置式创建按钮，支持 { label, value } 等字段。',
                  "group.options([{ label: '全部', value: 'all' }])"
                ],
                [
                  'group.selectable(true) / value()',
                  '开启单选并读取/设置当前值。',
                  "group.selectable(true).value('all')"
                ],
                ['group.change(handler)', '选中变化回调。', 'group.change((value) => {})'],
                [
                  'group.joined(true)',
                  '按钮首尾相连、共享边框，形成分段控件外观。',
                  'group.joined(true).selectable(true)'
                ],
                [
                  'group.variant() / size() / disabled()',
                  '统一默认外观与禁用。',
                  "group.variant('primary').size('small')"
                ]
              ].forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-button-group-examples');
          examples.h2('代码演示');
          buttonGroupDemos.forEach((demo) => {
            examples.child(ButtonGroupDemoSection(demo));
          });
        });
      });
    }
  };
}
