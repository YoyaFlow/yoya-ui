import { li, ref, vstack } from '../../index.js';

/**
 * HTML 原生元素页的 keyed 演示：信号驱动 ul/li 列表——
 * 添加/删除/反转全部走按 key 对账，行节点身份保持。
 */
export function KeyedListExample() {
  let serial = 1;
  const rows = ref([{ id: 1, title: '任务 1' }]);
  const api = {
    addRow() {
      serial += 1;
      rows.value = [...rows.value, { id: serial, title: `任务 ${serial}` }];
      return api;
    },
    reverse() {
      rows.value = [...rows.value].reverse();
      return api;
    },
    removeLast() {
      rows.value = rows.value.slice(0, -1);
      return api;
    },
    render() {
      return vstack({ gap: '10px' }, (stack) => {
        stack.ul((node) => {
          node.className('demo-keyed-list');
          node.attr('data-keyed-list', 'true');
          node.keyed(rows, (row) => row.id, (row) => li(row.title));
        });
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('添加一行', (button) => {
            button.attr('data-keyed-add', 'true');
            button.on('click', () => api.addRow());
          });
          row.vButton('反转', (button) => {
            button.variant('secondary');
            button.attr('data-keyed-reverse', 'true');
            button.on('click', () => api.reverse());
          });
          row.vButton('删除末行', (button) => {
            button.variant('secondary');
            button.attr('data-keyed-remove', 'true');
            button.on('click', () => api.removeLast());
          });
        });
      });
    }
  };
  return api;
}
