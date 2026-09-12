import { section, vCard } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  RateExample1,
  SelectExample1,
  SwitchExample1,
  TextareaExample1,
  TimerExample1,
  TimerRangeExample1,
  UploadExample1
} from './demos/form-controls-core.js';

// 演示定义：一页一个 demo，live 与源码面板共用同一个组件（唯一渲染路径）。
const demoDefinitions = Object.freeze([
  {
    key: 'select',
    route: 'form:select',
    heading: '选择框 vSelect',
    title: '选择框',
    intro: '在枚举选项中选择一个值，适合状态、类型等固定集合。',
    usage: ['需要从固定枚举中选择一项时。', '需要可读的状态或分类筛选时。'],
    apiRows: [
      ['vSelect({ options, value })', '创建选择框。', "vSelect({ options: ['A', 'B'] })"],
      ['select.value(next)', '读取或设置选中值。', "select.value('运行中')"],
      ['select.options(list)', '更新候选项。', 'select.options(["A", "B"])']
    ],
    component: SelectExample1,
    imports: ['vSelect']
  },
  {
    key: 'textarea',
    route: 'form:textarea',
    heading: '文本域 vTextarea',
    title: '文本域',
    intro: '多行文本输入，适合备注、说明等长文本。',
    usage: ['需要输入多行长文本时。', '需要与字段/表单组合收集时。'],
    apiRows: [
      ['vTextarea({ rows, value })', '创建文本域。', 'vTextarea({ rows: 4 })'],
      ['textarea.value(next)', '读取或设置内容。', "textarea.value('说明')"]
    ],
    component: TextareaExample1,
    imports: ['vTextarea']
  },
  {
    key: 'switch',
    route: 'form:switch',
    heading: '开关 vSwitch',
    title: '开关',
    intro: '布尔状态开关，适合自动化开关和功能开闭。',
    usage: ['需要即时切换布尔状态时。', '需要更直观的开关反馈时。'],
    apiRows: [
      ['vSwitch({ checked, label })', '创建开关。', 'vSwitch({ checked: true })'],
      ['switch.checked(next)', '读取或设置状态。', 'switch.checked(true)']
    ],
    component: SwitchExample1,
    imports: ['vSwitch']
  },
  {
    key: 'timer',
    route: 'form:timer',
    heading: '日期时间 vTimer',
    title: '日期时间',
    intro: '日期、日期时间和时间输入，支持模式切换。',
    usage: ['需要选择日期或时间时。', '适合调度和计划任务。'],
    apiRows: [
      ['vTimer({ mode, value })', '创建日期时间控件。', "vTimer({ mode: 'datetime-local' })"],
      ['timer.value(next)', '读取或设置值。', "timer.value('2026-08-19T14:30')"]
    ],
    component: TimerExample1,
    imports: ['vTimer']
  },
  {
    key: 'timer-range',
    route: 'form:timer-range',
    heading: '日期范围 vTimerRange',
    title: '日期范围',
    intro: '选择起止日期区间，结束早于开始会提示错误。',
    usage: ['需要查询区间或维护窗口时。'],
    apiRows: [
      ['vTimerRange({ value })', '创建日期范围。', 'vTimerRange({ value: { start, end } })'],
      ['range.value(next)', '读取或设置区间。', 'range.value({ start, end })']
    ],
    component: TimerRangeExample1,
    imports: ['vTimerRange']
  },
  {
    key: 'upload',
    route: 'form:upload',
    heading: '文件上传 vUpload',
    title: '文件上传',
    intro: '点击选择或拖拽文件，支持删除与进度展示。',
    usage: ['需要资料、附件上传时。', '适合导入任务和文件管理。'],
    apiRows: [
      ['vUpload({ multiple, accept })', '创建上传控件。', 'vUpload({ multiple: true })'],
      ['upload.value()', '读取已选文件。', 'upload.value()'],
      ['upload.on(change)', '监听文件变化。', "upload.on('change', handler)"]
    ],
    component: UploadExample1,
    imports: ['vUpload']
  },
  {
    key: 'rate',
    route: 'form:rate',
    heading: '评分 vRate',
    title: '评分',
    intro: '整数与半星评分，方向键和 Home/End 可微调。',
    usage: ['需要满意度或质量评分时。', '需要优先级打分时。'],
    apiRows: [
      ['vRate({ count, value, allowHalf })', '创建评分。', 'vRate({ count: 5, value: 4 })'],
      ['rate.value(next)', '读取或设置评分。', 'rate.value(4.5)']
    ],
    component: RateExample1,
    imports: ['vRate']
  }
]);

function ApiSection(definition) {
  return section((api) => {
    api.className('components-form-api');
    api.attr('data-form-api', definition.key);
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
}

/** 演示区：与其它文档页同一形态（data-form-demo / -live + ComponentSource）。 */
function DemoSection(definition) {
  const liveDemo = definition.component();
  const sourcePanel = ComponentSource({
    component: definition.component,
    sourceComponent: definition.component,
    imports: definition.imports,
    title: `${definition.key} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-form-demo');
        example.attr('data-form-demo', 'basic');
        example.h3(definition.title);
        example.div((live) => {
          live.className('components-form-demo-live');
          live.attr('data-form-demo-live', 'true');
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

function createPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(`components-route-page components-${definition.key}-docs`);
        page.attr('data-component-route-item', definition.route);
        page.attr('data-form-docs', definition.key);

        page.header((header) => {
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-form-usage');
          usage.h2('何时使用');
          usage.ul((list) => {
            definition.usage.forEach((item) => list.li(item));
          });
        });

        page.child(ApiSection(definition));

        page.section((examples) => {
          examples.className('components-form-examples');
          examples.h2('代码演示');
          examples.child(DemoSection(definition));
        });
      });
    }
  };
}

const pages = Object.freeze(
  Object.fromEntries(demoDefinitions.map((definition) => [definition.key, createPage(definition)]))
);

export const SelectDocumentationPage = () => pages.select;
export const TextareaDocumentationPage = () => pages.textarea;
export const SwitchDocumentationPage = () => pages.switch;
export const TimerDocumentationPage = () => pages.timer;
export const TimerRangeDocumentationPage = () => pages['timer-range'];
export const UploadDocumentationPage = () => pages.upload;
export const RateDocumentationPage = () => pages.rate;
