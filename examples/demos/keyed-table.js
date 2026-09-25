import { ref, th, tr, vNode, vstack } from '../../src/index.js';

/**
 * HTML 原生元素页的 keyed 演示：任务表按 key 对账——
 * 状态是 ref 字段（写句柄只刷那一格），任务是普通字段（换新行对象才刷新）。
 */
export function KeyedTableExample() {
  let serial = 3;
  const columns = ['任务', '负责人', '状态'];
  const rows = ref([
    { id: 1, title: '登录页联调', owner: 'Ada', status: ref('已完成') },
    { id: 2, title: '权限矩阵', owner: 'Lin', status: ref('进行中') },
    { id: 3, title: '表格虚拟滚动', owner: 'Mo', status: ref('进行中') }
  ]);

  return vNode((api) => {
    api.addRow = () => {
      serial += 1;
      const row = { id: serial, title: `任务 ${serial}`, owner: '未分配', status: ref('进行中') };
      rows.value = [...rows.value, row];
      return api;
    };
    api.toggle = (row) => {
      row.status.value = row.status.value === '进行中' ? '已完成' : '进行中';
      return api;
    };
    api.reverse = () => {
      rows.value = [...rows.value].reverse();
      return api;
    };

    return vstack({ gap: '10px' }, (stack) => {
      stack.table((grid) => {
        grid.className('demo-keyed-table').attr('data-keyed-table', 'true');
        grid.thead((head) => {
          head.tr((line) => line.child(columns.map((text) => th(text))));
        });
        grid.tbody((body) => {
          body.keyed(rows, (row) => row.id, (row) =>
            tr((line) => {
              line.attr('data-row-id', row.id);
              line.td(row.title);
              line.td(row.owner);
              line.td((cell) => {
                cell.button(row.status, (act) => act.on('click', () => api.toggle(row)));
              });
            })
          );
        });
      });
      stack.button('追加任务', (add) => {
        add.attr('data-keyed-add', 'true').on('click', () => api.addRow());
      });
      stack.button('反转', (reverse) => {
        reverse.attr('data-keyed-reverse', 'true').on('click', () => api.reverse());
      });
    });
  });
}
