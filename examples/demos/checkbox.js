import { computed, div, ref, vText } from '../../src/index.js';

const options = [
  { label: '监控告警', value: 'monitor' },
  { label: '自动扩容', value: 'scale' },
  { label: '日志采集', value: 'log' },
  { label: '灰度发布', value: 'canary' },
  { label: '链路追踪', value: 'trace' },
  { label: '告警收敛', value: 'mute' }
];

export function CheckboxColumnsExample() {
  let boxes = null;
  const columns = ref(2);
  const apply = (next) => {
    columns.value = next;
    boxes.columns(next);
  };

  return div((panel) => {
    panel.vstack({ gap: '12px' }, (stack) => {
      stack.hstack({ gap: '8px' }, (row) => {
        row.vButton('1 列', (b) => b.on('click', () => apply(1)));
        row.vButton('2 列', (b) => b.on('click', () => apply(2)));
        row.vButton('3 列', (b) => b.on('click', () => apply(3)));
        row.child(vText(computed(() => `${columns.value} 列`)));
      });
      stack.vCheckboxes((b) => {
        boxes = b;
        b.options(options);
        b.columns(2);
        b.value(['monitor']);
      });
    });
  });
}
