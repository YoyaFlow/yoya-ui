import { vRate, vSelect, vSwitch, vTextarea, vTimer, vTimerRange, vUpload } from '../../index.js';

export function SelectExample1() {
  return {
    render() {
      return vSelect({
        options: ['运行中', '维护中', '已停用'],
        value: '运行中'
      });
    }
  };
}

export function TextareaExample1() {
  return {
    render() {
      return vTextarea({ rows: 4, value: '初始说明' });
    }
  };
}

export function SwitchExample1() {
  return {
    render() {
      return vSwitch({ checked: true, label: '自动部署' });
    }
  };
}

export function TimerExample1() {
  return {
    render() {
      return vTimer({
        mode: 'datetime-local',
        value: '2026-08-19T14:30'
      });
    }
  };
}

export function TimerRangeExample1() {
  return {
    render() {
      return vTimerRange({
        name: 'maintenance',
        value: { start: '2026-08-19', end: '2026-08-21' }
      });
    }
  };
}

export function UploadExample1() {
  return {
    render() {
      return vUpload({
        multiple: true,
        accept: '.txt,.png,.jpg,.pdf'
      });
    }
  };
}

export function RateExample1() {
  return {
    render() {
      return vRate({
        allowHalf: true,
        count: 5,
        name: 'quality',
        value: 4
      });
    }
  };
}
