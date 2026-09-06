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

const pageConfigs = Object.freeze([
  {
    component: SelectExample1,
    heading: '选择框 vSelect',
    imports: ['vSelect'],
    intro: '在枚举选项中选择一个值，适合状态、类型等固定集合。',
    key: 'select',
    route: 'form:select',
    title: '选择框',
    usage: ['需要从固定枚举中选择一项时。', '需要可读的状态或分类筛选时。'],
    apiRows: [
      ['vSelect({ options, value })', '创建选择框。', "vSelect({ options: ['A', 'B'] })"],
      ['select.value(next)', '读取或设置选中值。', "select.value('运行中')"],
      ['select.options(list)', '更新候选项。', 'select.options(["A", "B"])']
    ]
  },
  {
    component: TextareaExample1,
    heading: '文本域 vTextarea',
    imports: ['vTextarea'],
    intro: '多行文本输入，适合备注、说明等长文本。',
    key: 'textarea',
    route: 'form:textarea',
    title: '文本域',
    usage: ['需要输入多行长文本时。', '需要与字段/表单组合收集时。'],
    apiRows: [
      ['vTextarea({ rows, value })', '创建文本域。', 'vTextarea({ rows: 4 })'],
      ['textarea.value(next)', '读取或设置内容。', "textarea.value('说明')"]
    ]
  },
  {
    component: SwitchExample1,
    heading: '开关 vSwitch',
    imports: ['vSwitch'],
    intro: '布尔状态开关，适合自动化开关和功能开闭。',
    key: 'switch',
    route: 'form:switch',
    title: '开关',
    usage: ['需要即时切换布尔状态时。', '需要更直观的开关反馈时。'],
    apiRows: [
      ['vSwitch({ checked, label })', '创建开关。', 'vSwitch({ checked: true })'],
      ['switch.checked(next)', '读取或设置状态。', 'switch.checked(true)']
    ]
  },
  {
    component: TimerExample1,
    heading: '日期时间 vTimer',
    imports: ['vTimer'],
    intro: '日期、日期时间和时间输入，支持模式切换。',
    key: 'timer',
    route: 'form:timer',
    title: '日期时间',
    usage: ['需要选择日期或时间时。', '适合调度和计划任务。'],
    apiRows: [
      ['vTimer({ mode, value })', '创建日期时间控件。', "vTimer({ mode: 'datetime-local' })"],
      ['timer.value(next)', '读取或设置值。', "timer.value('2026-08-19T14:30')"]
    ]
  },
  {
    component: TimerRangeExample1,
    heading: '日期范围 vTimerRange',
    imports: ['vTimerRange'],
    intro: '选择起止日期区间，结束早于开始会提示错误。',
    key: 'timer-range',
    route: 'form:timer-range',
    title: '日期范围',
    usage: ['需要查询区间或维护窗口时。'],
    apiRows: [
      ['vTimerRange({ value })', '创建日期范围。', 'vTimerRange({ value: { start, end } })'],
      ['range.value(next)', '读取或设置区间。', 'range.value({ start, end })']
    ]
  },
  {
    component: UploadExample1,
    heading: '文件上传 vUpload',
    imports: ['vUpload'],
    intro: '点击选择或拖拽文件，支持删除与进度展示。',
    key: 'upload',
    route: 'form:upload',
    title: '文件上传',
    usage: ['需要资料、附件上传时。', '适合导入任务和文件管理。'],
    apiRows: [
      ['vUpload({ multiple, accept })', '创建上传控件。', 'vUpload({ multiple: true })'],
      ['upload.value()', '读取已选文件。', 'upload.value()'],
      ['upload.on(change)', '监听文件变化。', "upload.on('change', handler)"]
    ]
  },
  {
    component: RateExample1,
    heading: '评分 vRate',
    imports: ['vRate'],
    intro: '整数与半星评分，方向键和 Home/End 可微调。',
    key: 'rate',
    route: 'form:rate',
    title: '评分',
    usage: ['需要满意度或质量评分时。', '需要优先级打分时。'],
    apiRows: [
      ['vRate({ count, value, allowHalf })', '创建评分。', 'vRate({ count: 5, value: 4 })'],
      ['rate.value(next)', '读取或设置评分。', 'rate.value(4.5)']
    ]
  }
]);

function createPage(config) {
  return {
    render() {
      return section((page) => {
        page.className(`components-route-page components-${config.key}-docs`);
        page.attr('data-component-route-item', config.route);
        page.attr(`data-${config.key}-docs`, 'true');
        page.h1(config.heading);
        page.p(config.intro);

        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            config.usage.forEach((item) => list.li(item));
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
              config.apiRows.forEach(([name, purpose, example]) => {
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
          const liveDemo = config.component();
          const sourcePanel = ComponentSource({
            component: config.component,
            sourceComponent: config.component,
            imports: config.imports,
            title: `${config.key} 核心源码`
          });
          examples.h3(config.title);
          examples.div((live) => {
            live.className('components-form-live');
            live.child(
              vCard((card) => {
                card.vCardBody((body) => body.child(liveDemo));
              })
            );
          });
          examples.child(sourcePanel);
        });
      });
    }
  };
}

const pages = Object.freeze(
  Object.fromEntries(pageConfigs.map((config) => [config.key, createPage(config)]))
);

export const SelectDocumentationPage = () => pages.select;
export const TextareaDocumentationPage = () => pages.textarea;
export const SwitchDocumentationPage = () => pages.switch;
export const TimerDocumentationPage = () => pages.timer;
export const TimerRangeDocumentationPage = () => pages['timer-range'];
export const UploadDocumentationPage = () => pages.upload;
export const RateDocumentationPage = () => pages.rate;
