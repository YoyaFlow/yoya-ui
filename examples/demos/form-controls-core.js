import {
  vRate,
  vSelect,
  vSwitch,
  vTextarea,
  vTimer,
  vTimerRange,
  vUpload
} from '../../src/index.js';

export function SelectExample1() {
  return vSelect({
    options: ['运行中', '维护中', '已停用'],
    value: '运行中'
  });
}

export function TextareaExample1() {
  return vTextarea({ rows: 4, value: '初始说明' });
}

export function SwitchExample1() {
  return vSwitch({ checked: true, label: '自动部署' });
}

export function TimerExample1() {
  return vTimer({
    mode: 'datetime-local',
    value: '2026-08-19T14:30'
  });
}

export function TimerRangeExample1() {
  return vTimerRange({
    name: 'maintenance',
    value: { start: '2026-08-19', end: '2026-08-21' }
  });
}

export function UploadExample1() {
  return vUpload({
    multiple: true,
    accept: '.txt,.png,.jpg,.pdf'
  });
}

export function RateExample1() {
  return vRate({
    allowHalf: true,
    count: 5,
    name: 'quality',
    value: 4
  });
}
