import { vCard, vText } from '../../../src/index.js';

export function ServiceFormCard({ toast }) {
  const formSnapshot = vText('尚未提交');
  const defaultServiceValues = () => ({
    autoDeploy: true,
    enabled: true,
    notes: '初始说明',
    regions: ['sh'],
    serviceName: 'api-gateway',
    status: '运行中'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础表单');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vForm 可以把字段、开关、勾选组和提交动作放在同一个收集点。');
            stack.vForm((form) => {
              form.id('service-form');
              form.style('gap', '12px');
              form.vField((field) => {
                field.label('服务名');
                field.control((editor) => {
                  editor.vInput({
                    name: 'serviceName',
                    placeholder: '请输入服务名',
                    value: 'api-gateway'
                  });
                });
              });
              form.vField((field) => {
                field.label('状态');
                field.control((editor) => {
                  editor.vSelect({ name: 'status', options: ['运行中', '停止'], value: '运行中' });
                });
              });
              form.vField((field) => {
                field.label('备注');
                field.control((editor) => {
                  editor.vTextarea({ name: 'notes', value: '初始说明' });
                });
              });
              form.hstack((row) => {
                row.className('form-inline-controls');
                row.style('gap', '16px');
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
                actions.className('form-actions');
                actions.style('justifyContent', 'flex-end');
                actions.vButton((button) => {
                  button.htmlType('submit');
                  button.label('提交表单');
                  button.variant('primary');
                  button.on('click', () => {
                    formSnapshot.textContent(JSON.stringify(form.values()));
                  });
                });
                actions.vButton((button) => {
                  button.label('重置');
                  button.on('click', () => {
                    form.values(defaultServiceValues());
                    formSnapshot.textContent('表单已重置');
                  });
                });
              });
              form.on('submit', (event) => {
                event.preventDefault();
                formSnapshot.textContent(JSON.stringify(form.values()));
                toast.success('表单已提交', { duration: 0 });
              });
              form.values(defaultServiceValues());
            });
            stack.hstack((row) => {
              row.className('form-summary');
              row.span('当前提交');
              row.spacer();
              row.output((output) => output.child(formSnapshot));
            });
          });
        });
      });
    }
  };
}

export function OwnerFieldCard() {
  const fieldModeState = vText('查看');
  let editableField = null;

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('字段模式');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vField 把查看态和编辑态收在一个组件里，适合资料页和详情页切换。');
            stack.vField((field) => {
              editableField = field;
              field.label('负责人');
              field.hint('点击按钮在查看态和编辑态之间切换。');
              field.display('SRE Team');
              field.control((editor) => {
                editor.vInput({ name: 'owner', value: 'SRE Team' });
              });
            });
            stack.hstack((row) => {
              row.className('field-actions');
              row.style('alignItems', 'center');
              row.vButton((button) => {
                button.label('切换模式');
                button.on('click', () => {
                  const nextMode = editableField.mode() === 'view' ? 'edit' : 'view';
                  editableField.mode(nextMode);
                  fieldModeState.textContent(nextMode === 'view' ? '查看' : '编辑');
                });
              });
              row.output((output) => output.child(fieldModeState));
            });
          });
        });
      });
    }
  };
}

export function ScheduleTimerCard() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('日期时间');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '12px');
            stack.p('vTimer 使用一致 API 提供日期、日期时间和时间输入。');
            stack.grid((fields) => {
              fields.className('timer-grid');
              fields.styles({
                gap: '12px',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'
              });
              fields.div((field) => {
                field.className('timer-field');
                field.label((label) => label.attr('for', 'deploy-date').text('部署日期'));
                field.vTimer({
                  id: 'deploy-date',
                  mode: 'date',
                  name: 'deployDate',
                  required: true,
                  value: '2026-08-19'
                });
              });
              fields.div((field) => {
                field.className('timer-field');
                field.label((label) => label.attr('for', 'scheduled-at').text('计划执行'));
                field.vTimer({
                  id: 'scheduled-at',
                  mode: 'datetime-local',
                  name: 'scheduledAt',
                  readonly: true,
                  value: '2026-08-19T14:30'
                });
              });
              fields.div((field) => {
                field.className('timer-field');
                field.label((label) => label.attr('for', 'daily-time').text('每日时间'));
                field.vTimer({
                  disabled: true,
                  id: 'daily-time',
                  mode: 'time',
                  name: 'dailyTime',
                  value: '09:00'
                });
              });
            });
          });
        });
      });
    }
  };
}

export function TimerRangeCard() {
  const rangeState = vText('2026-08-19 → 2026-08-21');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('日期范围');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '12px');
            stack.p('vTimerRange 统一管理开始值、结束值、范围变更和顺序校验。');
            stack.vTimerRange((range) => {
              range.name('maintenance');
              range.value({ start: '2026-08-19', end: '2026-08-21' });
              range.on('change', (event) => {
                rangeState.textContent(`${event.detail.start} → ${event.detail.end}`);
              });
            });
            stack.hstack((row) => {
              row.span('当前范围');
              row.spacer();
              row.output((output) => output.child(rangeState));
            });
          });
        });
      });
    }
  };
}

export const formsDatetimeCategory = {
  description: '表单采集、字段模式与日期时间控件。',
  id: 'forms-datetime',
  title: '表单与日期时间',
  demos: [
    { component: ServiceFormCard, imports: ['vCard', 'vText'], title: '基础表单核心源码' },
    { component: OwnerFieldCard, imports: ['vCard', 'vText'], title: '字段模式核心源码' },
    { component: ScheduleTimerCard, imports: ['vCard'], title: '日期时间核心源码' },
    { component: TimerRangeCard, imports: ['vCard', 'vText'], title: '日期范围核心源码' }
  ]
};
