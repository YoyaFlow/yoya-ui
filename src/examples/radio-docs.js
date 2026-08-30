import { div, section, vCard, vForm, vRadio, vRadios, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含单选框内容，不包含 Card。
function RadioGroupExample() {
  const output = vText('staging');
  const radios = vRadios({
    name: 'env',
    options: [
      { label: '开发环境', value: 'dev', description: '本地调试' },
      { label: '预发环境', value: 'staging', description: '上线前验证' },
      { label: '生产环境', value: 'prod', description: '对外服务' }
    ],
    value: 'staging',
    change(next) {
      output.textContent(next);
    }
  });

  return {
    render() {
      return div((body) => {
        body.child(radios);
        body.div((row) => {
          row.span('当前环境');
          row.spacer();
          row.output((el) => el.attr('data-radio-group-output', 'true').child(output));
        });
      });
    }
  };
}

function RadioSingleExample() {
  return div((body) => {
    body.vstack({ gap: '10px' }, (stack) => {
      stack.child(
        vRadio((radio) => {
          radio.name('deploy');
          radio.label('启用自动部署');
          radio.description('发布后自动执行');
          radio.checked(true);
        })
      );
      stack.child(
        vRadio((radio) => {
          radio.name('deploy');
          radio.label('保留历史版本');
          radio.description('回滚时可用');
        })
      );
      stack.child(
        vRadio((radio) => {
          radio.name('deploy');
          radio.label('定时发布');
          radio.description('按计划窗口执行');
          radio.disabled(true);
        })
      );
    });
  });
}

function RadioFormExample() {
  const result = vText('等待提交');
  const radios = vRadios((radios) => {
    radios.name('plan');
    radios.required(true);
    radios.options([
      { label: '滚动发布', value: 'rolling' },
      { label: '全量发布', value: 'full' }
    ]);
    radios.value('rolling');
  });

  return {
    render() {
      const form = vForm((form) => {
        form.on('submit', (event) => {
          event.preventDefault();
          const valid = form.validate();
          result.textContent(valid ? `已提交：${form.values().plan}` : '校验未通过');
        });
        form.p('发布方案');
        form.child(radios);
        form.hstack((actions) => {
          actions.style('justifyContent', 'flex-end');
          actions.vButton('提交', (button) => {
            button.variant('primary');
            button.formType('submit');
          });
          actions.vButton('清空', (button) => {
            button.on('click', () => {
              radios.clear();
              result.textContent('已清空选择');
            });
          });
        });
      });

      return div((body) => {
        body.child(form);
        body.div((row) => {
          row.span('提交结果');
          row.spacer();
          row.output((el) => el.attr('data-radio-form-output', 'true').child(result));
        });
      });
    }
  };
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function RadioGroupDemo() {
  const content = RadioGroupExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('单选组');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vRadios 提供互斥选择，change 回调返回当前值。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function RadioSingleDemo() {
  const content = RadioSingleExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('单选项');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vRadio 支持标签、说明、选中和禁用状态。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function RadioFormDemo() {
  const content = RadioFormExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('表单集成');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vRadios 自动参与表单取值与必填校验。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const radioDemos = [
  {
    id: 'group',
    title: '单选组',
    component: RadioGroupDemo,
    sourceComponent: RadioGroupExample,
    imports: ['div', 'vRadios', 'vText'],
    sourceTitle: '单选组源码'
  },
  {
    id: 'single',
    title: '单选项',
    component: RadioSingleDemo,
    sourceComponent: RadioSingleExample,
    imports: ['div', 'vRadio'],
    sourceTitle: '单选项源码'
  },
  {
    id: 'form',
    title: '表单集成',
    component: RadioFormDemo,
    sourceComponent: RadioFormExample,
    imports: ['div', 'vForm', 'vRadios', 'vText'],
    sourceTitle: '表单集成源码'
  }
];

function RadioDemoSection(demo) {
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
        example.className('components-radio-demo');
        example.attr('data-radio-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-radio-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function RadioDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-radio-docs');
        page.attr('data-component-route-item', 'form:4');
        page.attr('data-radio-docs', 'true');
        page.h1('vRadio 单选框');
        page.p('互斥选项选择控件，支持单选组、单选项与表单校验集成。');

        page.section((usage) => {
          usage.className('components-radio-usage');
          usage.attr('data-radio-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('选项互斥、只能选一个时使用单选组。');
            list.li('选项数量少（2～7 个）且需要一眼对比时优先单选。');
            list.li('需要必填校验时配合 vForm 使用。');
          });
        });

        page.section((api) => {
          api.className('components-radio-api');
          api.attr('data-radio-api', 'true');
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
                  'vRadio({ label, checked, disabled })',
                  '创建单个单选项。',
                  "vRadio({ label: '自动部署', checked: true })"
                ],
                [
                  'vRadios({ options, name, value })',
                  '创建互斥单选组。',
                  "vRadios({ options: [{ label: '开发', value: 'dev' }] })"
                ],
                [
                  'radios.value() / change(handler)',
                  '读取/设置选中值，变化回调。',
                  "radios.value('dev')"
                ],
                [
                  'radios.required(true) / disabled(true)',
                  '必填校验与整体禁用。',
                  'radios.required(true)'
                ],
                ['vForm.values() / validate()', '单选组自动参与表单取值与校验。', 'form.validate()']
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
          examples.className('components-radio-examples');
          examples.h2('代码演示');
          radioDemos.forEach((demo) => {
            examples.child(RadioDemoSection(demo));
          });
        });
      });
    }
  };
}
