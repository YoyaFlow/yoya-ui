import {
  BellOutlined,
  CheckOutlined,
  div,
  DownloadOutlined,
  HeartOutlined,
  HomeOutlined,
  PlusOutlined,
  SearchOutlined,
  section,
  SettingsOutlined,
  StarOutlined,
  UserOutlined,
  vCard,
  vSvgIconPicker,
  vText
} from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心演示：只包含选择器内容，不包含 Card。
function SvgIconPickerBasicExample() {
  const output = vText('StarOutlined');
  const picker = vSvgIconPicker((picker) => {
    picker.value('StarOutlined');
    picker.onChange((name) => output.textContent(name || '未选择'));
  });

  return {
    render() {
      return div((body) => {
        body.child(picker);
        body.div((row) => {
          row.style('marginTop', '10px');
          row.span('当前图标');
          row.spacer();
          row.code((el) => el.attr('data-svg-icon-picker-output', 'true').child(output));
        });
      });
    }
  };
}

function SvgIconPickerCustomExample() {
  const output = vText('未选择');
  const picker = vSvgIconPicker((picker) => {
    picker.icons([
      'StarOutlined',
      'HeartOutlined',
      'CheckOutlined',
      'BellOutlined',
      'HomeOutlined'
    ]);
    picker.onChange((name) => output.textContent(name || '未选择'));
  });

  return {
    render() {
      return div((body) => {
        body.p('icons() 可限制候选图标，或传入 { name, icon } 使用自定义图标。');
        body.child(picker);
        body.div((row) => {
          row.style('marginTop', '10px');
          row.span('当前图标');
          row.spacer();
          row.code((el) => el.attr('data-svg-icon-picker-custom-output', 'true').child(output));
        });
      });
    }
  };
}

function SvgIconPickerLazyExample() {
  const output = vText('未选择');
  const factories = [
    StarOutlined,
    HeartOutlined,
    CheckOutlined,
    BellOutlined,
    HomeOutlined,
    SettingsOutlined,
    SearchOutlined,
    UserOutlined,
    PlusOutlined,
    DownloadOutlined
  ];
  const many = Array.from({ length: 120 }, (_, index) => ({
    name: `CustomIcon${index + 1}`,
    icon: factories[index % factories.length]
  }));
  const picker = vSvgIconPicker((picker) => {
    picker.icons(many);
    picker.onChange((name) => output.textContent(name || '未选择'));
  });

  return {
    render() {
      return div((body) => {
        body.p('图标数量较多时分批渲染：首批 24 个，滚动接近底部自动加载下一批。');
        body.child(picker);
        body.div((row) => {
          row.style('marginTop', '10px');
          row.span('当前图标');
          row.spacer();
          row.code((el) => el.attr('data-svg-icon-picker-lazy-output', 'true').child(output));
        });
      });
    }
  };
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function SvgIconPickerBasicDemo() {
  const content = SvgIconPickerBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vSvgIconPicker 点击触发器打开弹窗，弹窗内提供图标方阵，点击图标即选中。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SvgIconPickerCustomDemo() {
  const content = SvgIconPickerCustomExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义图标集');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('icons() 限定候选图标，适合只需要少数几个语义图标的场景。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SvgIconPickerLazyDemo() {
  const content = SvgIconPickerLazyExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('大量图标懒加载');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('弹窗内图标方阵固定高度可滚动，图标分批渲染，滚动到底再加载下一批。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const svgIconPickerDemos = [
  {
    component: SvgIconPickerBasicDemo,
    id: 'basic',
    imports: ['div', 'vSvgIconPicker', 'vText'],
    sourceComponent: SvgIconPickerBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: SvgIconPickerCustomDemo,
    id: 'custom',
    imports: ['div', 'vSvgIconPicker', 'vText'],
    sourceComponent: SvgIconPickerCustomExample,
    sourceTitle: '自定义图标集源码',
    title: '自定义图标集'
  },
  {
    component: SvgIconPickerLazyDemo,
    id: 'lazy',
    imports: [
      'div',
      'vSvgIconPicker',
      'vText',
      'BellOutlined',
      'CheckOutlined',
      'DownloadOutlined',
      'HeartOutlined',
      'HomeOutlined',
      'PlusOutlined',
      'SearchOutlined',
      'SettingsOutlined',
      'StarOutlined',
      'UserOutlined'
    ],
    sourceComponent: SvgIconPickerLazyExample,
    sourceTitle: '大量图标懒加载源码',
    title: '大量图标懒加载'
  }
];

function SvgIconPickerDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.sourceComponent,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-svg-icon-picker-demo');
        example.attr('data-svg-icon-picker-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-svg-icon-picker-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function SvgIconPickerDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-svg-icon-picker-docs');
        page.attr('data-svg-icon-picker-docs', 'true');
        page.attr('data-component-route-item', 'form:svg-icon-picker');
        page.h1('vSvgIconPicker 图标选择器');
        page.p('带弹窗的 SVG 图标选择器：点击打开图标方阵，选中后触发器展示当前图标。');

        page.section((usage) => {
          usage.className('components-svg-icon-picker-usage');
          usage.attr('data-svg-icon-picker-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要让用户在图标库中挑选一个图标（菜单、按钮、卡片配图）。');
            list.li('需要限定候选图标集合时，用 icons() 收窄选项。');
            list.li('配合 vForm 的 name() 自动收集选中图标名。');
          });
        });

        page.section((api) => {
          api.className('components-svg-icon-picker-api');
          api.attr('data-svg-icon-picker-api', 'true');
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
                ['value(name)', '读写当前选中图标名。', 'picker.value("StarOutlined")'],
                [
                  'icons(list)',
                  '设置候选图标（内置名或 { name, icon }）。',
                  'picker.icons(["StarOutlined"])'
                ],
                ['open() / close()', '打开 / 关闭选择弹窗。', 'picker.open()'],
                [
                  'onChange(handler)',
                  '图标变化回调（name, picker）。',
                  'picker.onChange((name) => ...)'
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

        svgIconPickerDemos.forEach((demo) => page.child(SvgIconPickerDemoSection(demo)));
      });
    }
  };
}
