import { section, vCard, vText, vstack } from '../index.js';
import { ComponentSource } from './component-source.js';
import { InputExample1 } from './demos/input.js';

const demoDefinitions = Object.freeze([
  {
    component: InputLiveDemo,
    description: '输入后值实时同步到右侧状态区，适合搜索和单行编辑场景。',
    id: 'sync',
    imports: ['vInput'],
    sourceComponent: InputExample1,
    sourceTitle: '输入框核心源码',
    title: '输入同步'
  }
]);

export function InputDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-input-docs');
        page.attr('data-component-route-item', 'form:input');
        page.attr('data-input-docs', 'true');

        page.header((header) => {
          header.h1('输入框 vInput');
          header.p('单行文本输入，支持占位符、初始值与双向同步读取。');
        });

        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要输入短文本（名称、地址、搜索词）时。');
            list.li('需要读取或回填单行值时。');
          });
        });

        page.section((api) => {
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
                  'vInput({ placeholder, value })',
                  '创建输入框。',
                  "vInput({ placeholder: '搜索' })"
                ],
                ['input.value(next)', '读取或设置值。', "input.value('api-gateway')"],
                ['input.on(input)', '监听输入事件。', "input.on('input', handler)"]
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
          examples.h2('代码演示');
          demoDefinitions.forEach((demo) => examples.child(InputDemoSection(demo)));
        });
      });
    }
  };
}

function InputLiveDemo() {
  const status = vText('yoya-ui');

  return {
    render() {
      return vstack({ gap: '12px' }, (content) => {
        content.vInput((input) => {
          input.attr('data-input-sync', 'true');
          input.placeholder('请输入服务名');
          input.value('yoya-ui');
          input.on('input', (event) => status.textContent(event.target.value));
        });
        content.hstack((row) => {
          row.span('当前值');
          row.spacer();
          row.code((code) => code.attr('data-input-sync-output', 'true').child(status));
        });
      });
    }
  };
}

function InputDemoSection(demo) {
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
        example.attr('data-input-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-input-demo-live');
          live.child(
            vCard((card) => {
              card.vCardBody((body) => body.child(liveDemo));
            })
          );
        });
        example.child(sourcePanel);
      });
    }
  };
}
