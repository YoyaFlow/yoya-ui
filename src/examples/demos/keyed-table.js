import { ref, th, tr, vstack } from '../../index.js';

/**
 * HTML 原生元素页的 keyed 演示：信号驱动的任务表按 key 对账——
 * 追加 / 上移 / 改状态只动变化的行，其余行节点身份保持。
 */
export function KeyedTableExample() {
  let serial = 3;
  const columns = ['任务', '负责人', '状态', '操作'];
  const rows = ref([
    { id: 1, title: '登录页联调', owner: 'Ada', done: true },
    { id: 2, title: '权限矩阵', owner: 'Lin', done: false },
    { id: 3, title: '表格虚拟滚动', owner: 'Mo', done: false }
  ]);

  const api = {
    addRow() {
      serial += 1;
      const row = { id: serial, title: `任务 ${serial}`, owner: '未分配', done: false };
      rows.value = [...rows.value, row];
      return api;
    },
    moveUp(id) {
      const next = [...rows.value];
      const index = next.findIndex((row) => row.id === id);
      if (index < 1) return api;
      next.splice(index - 1, 0, next.splice(index, 1)[0]);
      rows.value = next;
      return api;
    },
    flip(id) {
      rows.value = rows.value.map((row) => (row.id === id ? { ...row, done: !row.done } : row));
      return api;
    },
    render() {
      return vstack({ gap: '10px' }, (stack) => {
        stack.table((grid) => {
          grid.className('demo-keyed-table').attr('data-keyed-table', 'true');
          grid.thead((head) => {
            head.tr((line) => line.child(columns.map((text) => th(text))));
          });
          grid.tbody((body) => {
            body.keyed(rows, (row) => row.id, (row) =>
              tr((line) => {
                const { id, done } = row;
                line.attr('data-row-id', id);
                line.td(row.title);
                line.td(row.owner);
                line.td(done ? '已完成' : '进行中');
                line.td((cell) => {
                  cell.button('上移', (up) => up.on('click', () => api.moveUp(id)));
                  cell.button(done ? '重开' : '完成', (act) => act.on('click', () => api.flip(id)));
                });
              })
            );
          });
        });
        stack.button('追加任务', (add) => {
          add.attr('data-keyed-add', 'true').on('click', () => api.addRow());
        });
      });
    }
  };
  return api;
}
