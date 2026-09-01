import { ArrowUpOutlined, PlusOutlined } from '../svg/icons.js';
import { div, hstack, section, vCard, vFloatButton, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含悬浮按钮内容，不包含 Card。
function FloatButtonBasicExample() {
  const output = vText('等待点击');
  const fab = vFloatButton({
    icon: PlusOutlined(),
    variant: 'primary'
  });

  fab.on('click', () => {
    output.textContent('已触发新建操作');
  });

  return {
    render() {
      return div((body) => {
        body.hstack({ gap: '14px' }, (row) => {
          row.style('alignItems', 'center');
          row.child(fab);
          row.span((el) => el.attr('data-float-button-output', 'true').child(output));
        });
      });
    }
  };
}

function FloatButtonExtendedExample() {
  return vFloatButton({
    icon: ArrowUpOutlined(),
    label: '回到顶部',
    variant: 'secondary'
  });
}

function FloatButtonSizesExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vFloatButton({ icon: PlusOutlined(), size: 'small' }));
    row.child(vFloatButton({ icon: PlusOutlined(), size: 'medium' }));
    row.child(vFloatButton({ icon: PlusOutlined(), size: 'large' }));
  });
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function FloatButtonBasicDemo() {
  const content = FloatButtonBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('图标按钮');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('只保留图标作为常驻操作入口，点击触发操作。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function FloatButtonExtendedDemo() {
  const content = FloatButtonExtendedExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('扩展标签');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('图标旁附加文字说明，适合需要明确语义的常驻入口。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function FloatButtonSizesDemo() {
  const content = FloatButtonSizesExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('尺寸');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('通过 size 切换 small、medium 和 large 三种尺寸。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const floatButtonDemos = [
  {
    id: 'basic',
    title: '图标按钮',
    component: FloatButtonBasicDemo,
    sourceComponent: FloatButtonBasicExample,
    imports: ['PlusOutlined', 'div', 'vFloatButton', 'vText'],
    sourceTitle: '图标按钮源码'
  },
  {
    id: 'extended',
    title: '扩展标签',
    component: FloatButtonExtendedDemo,
    sourceComponent: FloatButtonExtendedExample,
    imports: ['ArrowUpOutlined', 'vFloatButton'],
    sourceTitle: '扩展标签源码'
  },
  {
    id: 'sizes',
    title: '尺寸',
    component: FloatButtonSizesDemo,
    sourceComponent: FloatButtonSizesExample,
    imports: ['PlusOutlined', 'hstack', 'vFloatButton'],
    sourceTitle: '尺寸源码'
  }
];

function FloatButtonDemoSection(demo) {
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
        example.className('components-float-button-demo');
        example.attr('data-float-button-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-float-button-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function FloatButtonDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-float-button-docs');
        page.attr('data-component-route-item', 'general:float-button');
        page.attr('data-float-button-docs', 'true');
        page.h1('vFloatButton 悬浮按钮');
        page.p('圆形常驻操作入口，支持图标、扩展标签和固定定位。');

        page.section((usage) => {
          usage.className('components-float-button-usage');
          usage.attr('data-float-button-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要常驻的快捷操作入口（新建、回到顶部、展开面板）。');
            list.li('页面空间有限时，用图标按钮收起次要操作。');
            list.li('需要固定在视口角落时，配合 fixed 与 position 使用。');
          });
        });

        page.section((api) => {
          api.className('components-float-button-api');
          api.attr('data-float-button-api', 'true');
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
                  'vFloatButton({ icon, label, variant, size })',
                  '创建悬浮按钮。',
                  'vFloatButton({ icon: PlusOutlined() })'
                ],
                [
                  'fab.icon(content) / label(content)',
                  '设置图标与扩展标签。',
                  "fab.label('回到顶部')"
                ],
                [
                  'fab.fixed(true) / position(name)',
                  '固定定位并选择视口角落。',
                  "fab.fixed(true).position('bottom-right')"
                ],
                [
                  'fab.variant() / size() / disabled()',
                  '外观与禁用状态。',
                  "fab.variant('secondary').size('small')"
                ],
                ['fab.on("click", handler)', '点击操作。', "fab.on('click', () => {})"]
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
          examples.className('components-float-button-examples');
          examples.h2('代码演示');
          floatButtonDemos.forEach((demo) => {
            examples.child(FloatButtonDemoSection(demo));
          });
        });
      });
    }
  };
}
