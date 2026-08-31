import { div, section, vCard, vColorPicker, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心演示：只包含取色器内容，不包含 Card。
function ColorPickerBasicExample() {
  const output = vText('#2563eb');
  const picker = vColorPicker({
    onChange(color) {
      output.textContent(color);
    },
    value: '#2563eb'
  });

  return {
    render() {
      return div((body) => {
        body.child(picker);
        body.div((row) => {
          row.span('当前颜色');
          row.spacer();
          row.code((el) => el.attr('data-color-picker-output', 'true').child(output));
        });
      });
    }
  };
}

function ColorPickerAlphaExample() {
  const output = vText('rgba(37, 99, 235, 1)');
  const picker = vColorPicker((picker) => {
    picker.value('#2563eb');
    picker.onChange(() => output.textContent(picker.rgba() || '未选择'));
  });

  return {
    render() {
      return div((body) => {
        body.p('右侧滑块调节透明度，棋盘格实时展示半透明效果。');
        body.child(picker);
        body.div((row) => {
          row.span('当前 rgba');
          row.spacer();
          row.code((el) => el.attr('data-color-picker-alpha-output', 'true').child(output));
        });
      });
    }
  };
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function ColorPickerBasicDemo() {
  const content = ColorPickerBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vColorPicker 提供原生取色、当前色预览，change 回调返回颜色值。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function ColorPickerAlphaDemo() {
  const content = ColorPickerAlphaExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('透明度与效果');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('调节透明度并实时查看已选颜色的半透明效果。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const colorPickerDemos = [
  {
    component: ColorPickerBasicDemo,
    id: 'basic',
    imports: ['div', 'vColorPicker', 'vText'],
    sourceComponent: ColorPickerBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: ColorPickerAlphaDemo,
    id: 'alpha',
    imports: ['div', 'vColorPicker', 'vText'],
    sourceComponent: ColorPickerAlphaExample,
    sourceTitle: '透明度与效果源码',
    title: '透明度与效果'
  }
];

function ColorPickerDemoSection(demo) {
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
        example.className('components-color-picker-demo');
        example.attr('data-color-picker-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-color-picker-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function ColorPickerDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-color-picker-docs');
        page.attr('data-color-picker-docs', 'true');
        page.attr('data-component-route-item', 'form:12');
        page.h1('vColorPicker 颜色选择器');
        page.p('自定义弹窗颜色选择器：预设色板、透明度调节与已选颜色效果预览。');

        page.section((usage) => {
          usage.className('components-color-picker-usage');
          usage.attr('data-color-picker-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要让用户选择颜色并即时看到预览时。');
            list.li('需要透明度/半透明效果预览时。');
            list.li('预设色板 + 滑块即可覆盖常见取色场景。');
          });
        });

        page.section((api) => {
          api.className('components-color-picker-api');
          api.attr('data-color-picker-api', 'true');
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
                ['value(color)', '读写当前颜色。', 'picker.value("#7c3aed")'],
                ['alpha(value)', '读写透明度（0-100）。', 'picker.alpha(50)'],
                ['rgba()', '返回带透明度的颜色串。', 'picker.rgba()'],
                ['palette(list)', '自定义预设色板。', 'picker.palette(["#2563eb"])'],
                [
                  'onChange(handler)',
                  '颜色变化回调（color, alpha, picker）。',
                  'picker.onChange((color, alpha) => ...)'
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

        colorPickerDemos.forEach((demo) => page.child(ColorPickerDemoSection(demo)));
      });
    }
  };
}
