import { div, section, vCard, vForm, vText } from '../src/index.js';
import { ComponentSource } from './component-source.js';

const formDocsDefinition = Object.freeze({
  apiIntro: 'vForm 负责收集字段值、校验必填项和触发提交，字段标签直接用 label 组合控件。',
  apiRows: [
    ['vForm({ values })', '创建表单并回填初始值。', "vForm({ values: { name: 'api-gateway' } })"],
    ['form.values(value)', '读取或回填整张表单的值。', 'form.values()'],
    ['form.validate()', '校验必填字段，返回是否通过。', 'form.validate()'],
    ['form.reset()', '重置为浏览器表单初始值。', 'form.reset()'],
    ['form.on(submit)', '监听提交并阻止默认跳转。', "form.on('submit', handler)"],
    ['row.label(content) + row.vInput(...)', '在字段容器里组合标签和控件。', "row.label('服务名')"],
    [
      'vFormItem({ name, label, hint, required, validate, control })',
      '自带标签、提示和校验的字段容器。',
      'form.vFormItem((item) => ...)'
    ],
    [
      'item.required({ message, indicator })',
      '设置必填校验、错误提示和可选标识。',
      "item.required({ message: '项目名称不能为空', indicator: '*' })"
    ],
    ['item.validate(callback)', '添加自定义校验回调。', 'item.validate((value) => ...)'],
    [
      'editor.collectValue(callback)',
      '自定义组件注册取值函数。',
      'editor.collectValue(() => custom.value())'
    ],
    ['control.value(value)', '读取或设置单个控件值。', 'input.value()'],
    ['control.error(value)', '切换控件错误态。', 'input.error(true)']
  ],
  apiSignature: `const form = vForm((form) => {
  form.div((row) => {
    row.label('服务名');
    row.vInput({ name: 'serviceName', value: 'api-gateway' });
  });
  form.on('submit', (event) => {
    event.preventDefault();
    console.log(form.values());
  });
});`,
  examples: [
    {
      component: BasicFormCard,
      description: '用 label 和控件直接组成字段，提交时统一读取 values。',
      id: 'basic',
      imports: ['vForm', 'vText'],
      sourceComponent: FormExample1,
      sourceTitle: '基础表单核心源码',
      title: '基础表单'
    },
    {
      component: ValidatedFormCard,
      description: '提交时校验必填字段，并通过 error 状态把问题反馈到控件上。',
      id: 'validated',
      imports: ['vForm', 'vFormItem', 'vInput', 'vSelect', 'vText'],
      sourceComponent: FormExample2,
      sourceTitle: '表单校验核心源码',
      title: '表单校验'
    },
    {
      component: CustomCollectCard,
      description: '非标准组件通过 collectValue 注册取值函数，vForm 可以像标准控件一样读取。',
      id: 'collect-value',
      imports: ['vForm', 'vFormItem', 'vText'],
      sourceComponent: FormExample3,
      sourceTitle: '自定义取值核心源码',
      title: '自定义取值'
    }
  ],
  examplesIntro: '下面三个示例分别展示基础表单、表单校验和自定义组件取值。',
  heading: 'vForm 表单',
  intro:
    '表单文档页把字段、值收集、校验和提交动作放在同一个可复制的示例里，适合资料编辑、配置管理和搜索条件。',
  key: 'form',
  routeItem: 'form:0',
  title: '表单',
  usageItems: [
    '多个输入控件需要一起读取或回填时，用 vForm.values()。',
    '字段标签直接用 label，控件放在同一个字段容器里。',
    '提交前需要必填校验时，先 form.validate()，再把错误显示到对应控件。'
  ],
  usageIntro: '表单适合把多个字段聚合成一个可提交、可重置、可校验的数据单元。',
  usageTitle: '何时使用'
});

export function FormDocumentationPage() {
  return createFormDocumentationPage(formDocsDefinition);
}

function createFormDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          'components-route-page components-form-docs components-feedback-docs components-form-docs--form'
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-form-docs', definition.key);

        page.header((header) => {
          header.className('components-feedback-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-feedback-docs-usage');
          usage.attr('data-form-usage', definition.key);
          usage.h2(definition.usageTitle);
          usage.p(definition.usageIntro);
          usage.ul((list) => {
            definition.usageItems.forEach((item) => list.li(item));
          });
        });

        page.section((api) => {
          api.className('components-feedback-docs-api');
          api.h2('常用 API');
          api.p(definition.apiIntro);
          api.pre((pre) => {
            pre.className('feedback-api-signature');
            pre.code(definition.apiSignature);
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
              definition.apiRows.forEach(([name, purpose, example]) => {
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
          examples.className('components-feedback-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(FormExampleSection(demo));
          });
        });
      });
    }
  };
}

function FormExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent ?? demo.component,
    imports: demo.imports ?? [],
    title: demo.sourceTitle ?? `${demo.title} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-feedback-demo');
        example.attr('data-form-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-feedback-demo-live');
          live.attr('data-form-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function BasicFormCard() {
  const form = FormExample1();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础表单');
        card.vCardBody((body) => body.child(form));
      });
    }
  };
}

function ValidatedFormCard() {
  const form = FormExample2();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('表单校验');
        card.vCardBody((body) => body.child(form));
      });
    }
  };
}

function CustomCollectCard() {
  const form = FormExample3();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义取值');
        card.vCardBody((body) => body.child(form));
      });
    }
  };
}

function FormExample1() {
  const snapshot = vText('尚未提交');
  const defaults = () => ({
    autoDeploy: true,
    enabled: true,
    name: 'api-gateway',
    notes: '初始说明',
    regions: ['sh'],
    status: '运行中'
  });

  return {
    render() {
      return vForm((form) => {
        form.style('gap', '14px');
        form.div((row) => {
          row.style({ display: 'grid', gap: '6px' });
          row.label('服务名');
          row.vInput({
            name: 'name',
            placeholder: '请输入服务名',
            value: 'api-gateway'
          });
        });
        form.div((row) => {
          row.style({ display: 'grid', gap: '6px' });
          row.label('状态');
          row.vSelect({ name: 'status', options: ['运行中', '停止'], value: '运行中' });
        });
        form.div((row) => {
          row.style({ display: 'grid', gap: '6px' });
          row.label('备注');
          row.vTextarea({
            name: 'notes',
            value: '初始说明'
          });
        });
        form.hstack((row) => {
          row.style({ flexWrap: 'wrap', gap: '16px' });
          row.vCheckbox({ checked: true, label: '启用服务', name: 'enabled' });
          row.vSwitch({ checked: true, label: '自动部署', name: 'autoDeploy' });
        });
        form.vCheckboxes({
          name: 'regions',
          options: [
            { checked: true, label: '上海', value: 'sh' },
            { label: '杭州', value: 'hz' }
          ]
        });
        form.hstack((actions) => {
          actions.style('justifyContent', 'flex-end');
          actions.vButton((button) => {
            button.label('提交表单');
            button.variant('primary');
            button.formType('submit');
          });
          actions.vButton((button) => {
            button.label('重置');
            button.on('click', () => {
              form.values(defaults());
              snapshot.textContent('表单已重置');
            });
          });
        });
        form.output((output) => {
          output.style('fontSize', '12px');
          output.child(snapshot);
        });
        form.on('submit', (event) => {
          event.preventDefault();
          snapshot.textContent(JSON.stringify(form.values()));
        });
        form.values(defaults());
      });
    }
  };
}

function FormExample2() {
  const result = vText('等待提交');

  return {
    render() {
      return vForm((form) => {
        form.style('gap', '14px');
        form.vFormItem((item) => {
          item.name('projectName').label('项目名称').hint('请输入项目名称');
          item.required({ message: '项目名称不能为空', indicator: '*' });
          item.validate((value) => (value && value.length >= 2 ? null : '至少输入 2 个字符'));
          item.control((editor) => {
            editor.vInput({ name: 'projectName', placeholder: '请输入项目名称' });
          });
        });
        form.vFormItem((item) => {
          item.name('role').label('负责人角色').hint('请选择负责人角色');
          item.required({ message: '请选择负责人角色', indicator: '*' });
          item.control((editor) => {
            editor.vSelect({
              name: 'role',
              options: ['开发', '测试', '运维'],
              placeholder: '请选择角色'
            });
          });
        });
        form.hstack((actions) => {
          actions.style('justifyContent', 'flex-end');
          actions.vButton((button) => {
            button.label('提交');
            button.variant('primary');
            button.formType('submit');
          });
        });
        form.output((output) => {
          output.style('fontSize', '12px');
          output.child(result);
        });
        form.on('submit', (event) => {
          event.preventDefault();
          if (!form.validate()) {
            result.textContent('请检查必填项');
            return;
          }
          result.textContent(JSON.stringify(form.values()));
        });
      });
    }
  };
}

function FormExample3() {
  const result = vText('尚未读取');
  const CustomOwnerPicker = () => {
    let value = 'SRE Team';
    const status = vText(value);

    return {
      value() {
        return value;
      },
      render() {
        return div((node) => {
          node.styles({ alignItems: 'center', display: 'flex', gap: '8px' });
          node.output((output) => {
            output.style('fontWeight', '600');
            output.child(status);
          });
          ['SRE Team', 'Platform'].forEach((name) => {
            node.vButton((button) => {
              button.label(name);
              button.variant('secondary');
              button.on('click', () => {
                value = name;
                status.textContent(name);
              });
            });
          });
        });
      }
    };
  };

  return {
    render() {
      return vForm((form) => {
        form.style('gap', '14px');
        form.vFormItem((item) => {
          item.name('owner').label('负责人').hint('自定义组件通过 collectValue 提供值');
          item.validate((value) => (value ? null : '请选择负责人'));
          item.control((editor) => {
            const custom = CustomOwnerPicker();
            editor.collectValue(() => custom.value());
            editor.child(custom);
          });
        });
        form.hstack((actions) => {
          actions.style('justifyContent', 'flex-end');
          actions.vButton((button) => {
            button.label('读取值');
            button.variant('primary');
            button.formType('submit');
          });
        });
        form.output((output) => {
          output.style('fontSize', '12px');
          output.child(result);
        });
        form.on('submit', (event) => {
          event.preventDefault();
          if (!form.validate()) {
            result.textContent('请选择负责人');
            return;
          }
          result.textContent(`负责人：${form.values().owner}`);
        });
      });
    }
  };
}
