import { ComponentSource } from './component-source.js';
import { section } from '../index.js';
import {
  ButtonExample1,
  ButtonFormExample1,
  ButtonSizesExample1,
  ButtonStatesExample1,
  ButtonVariantsExample1
} from './detail-sources.js';

export const buttonDemoDefinitions = Object.freeze([
  {
    id: 'basic',
    title: '基础用法',
    description: '使用 label 设置按钮文案，使用 variant 表达主要操作。',
    component: ButtonExample1,
    sourceComponent: ButtonExample1,
    imports: ['vButton']
  },
  {
    id: 'variants',
    title: '按钮变体',
    description: '通过 variant 区分 primary、secondary、danger 和 ghost 四种语义。',
    component: ButtonVariantsExample1,
    sourceComponent: ButtonVariantsExample1,
    imports: ['hstack', 'vButton']
  },
  {
    id: 'sizes',
    title: '按钮尺寸',
    description: '通过 size 设置 small、medium 和 large 三种尺寸。',
    component: ButtonSizesExample1,
    sourceComponent: ButtonSizesExample1,
    imports: ['hstack', 'vButton']
  },
  {
    id: 'states',
    title: '加载与禁用',
    description: 'loading 适合异步操作，disabled 适合暂时不可执行的操作。',
    component: ButtonStatesExample1,
    sourceComponent: ButtonStatesExample1,
    imports: ['hstack', 'vButton', 'vText']
  },
  {
    id: 'form',
    title: '表单按钮',
    description: '通过 formType 指定 submit 或 reset，保持原生表单语义。',
    component: ButtonFormExample1,
    sourceComponent: ButtonFormExample1,
    imports: ['hstack', 'vButton', 'vForm', 'vText']
  }
]);

export function ButtonDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-button-docs');
        page.attr('data-component-route-item', 'general:button');
        page.attr('data-button-docs', 'true');

        page.header((header) => {
          header.className('components-button-docs-header');
          header.h1('vButton 按钮');
          header.p('用于触发一个明确的即时操作，并自带 hover、按下和焦点反馈。');
        });

        page.section((usage) => {
          usage.className('components-button-docs-usage');
          usage.attr('data-button-usage', 'true');
          usage.h2('何时使用');
          usage.p('按钮负责表达操作语义和当前状态，业务请求、权限判断和提交策略由调用方控制。');
          usage.ul((list) => {
            list.li('一个操作区域优先保留一个 primary 按钮。');
            list.li('危险操作使用 danger，并在业务层补充确认逻辑。');
            list.li('异步操作开始后设置 loading，完成后恢复按钮状态。');
            list.li('键盘焦点、鼠标悬停和按下状态由组件统一处理。');
          });
        });

        page.section((api) => {
          api.className('components-button-docs-api');
          api.h2('常用 API');
          api.p('构造函数支持内容、元素配置和最后定制三个参数：');
          api.pre((pre) => {
            pre.className('button-api-signature');
            pre.code("vButton('OK', { attrs: {}, style: {} }, (button) => {})");
          });
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
                ['label(content)', '设置显示内容', "button.label('保存')"],
                ['variant(value)', '设置视觉语义', "button.variant('primary')"],
                ['size(value)', '设置尺寸', "button.size('small')"],
                ['loading(value)', '显示加载状态', 'button.loading(true)'],
                ['disabled(value)', '禁用按钮', 'button.disabled(true)'],
                ['formType(value)', '指定表单按钮类型', "button.formType('submit')"]
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
          examples.className('components-button-docs-examples');
          examples.h2('代码演示');
          examples.p('每个示例都可以直接复制源码，在自己的对象组件中使用。');
          buttonDemoDefinitions.forEach((demo) => examples.child(ButtonExampleSection(demo)));
        });
      });
    }
  };
}

function ButtonExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: `${demo.sourceComponent.name} 源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-button-demo');
        example.attr('data-button-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-button-demo-live');
          live.attr('data-button-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
