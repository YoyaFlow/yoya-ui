// 「逻辑行 vs 真实 DOM」档：同一个列表用 vScroll 虚拟滚动，只渲染可视窗口。
// 这一档只回答"省了什么、代价在哪"：逻辑行数、真实节点数、跳转耗时、堆占用。
import { div, ref, vScroll, vText } from '/dist/yoya.ui-router.full.min.js';

const params = new URLSearchParams(location.search);
const initialRows = Number(params.get('rows') ?? 10000);

const counters = { builds: 0 };
let rows = [];

function makeRows(from, count) {
  return Array.from({ length: count }, (_, index) => {
    const id = from + index;
    return { id, label: ref(`label ${id}`) };
  });
}

function buildRow(row) {
  counters.builds += 1;
  return div((line) => {
    line.className('row');
    line.attr('data-row-id', String(row.id));
    line.span((cell) => cell.className('row-id').child(String(row.id)));
    line.span((cell) => cell.child(vText(row.label)));
  });
}

const list = vScroll({ itemHeight: 40, overscan: 5 });
list.style({ height: '400px' });

const host = document.getElementById('vscroll-host');
host.appendChild(list.renderDom());

function setCount(count) {
  rows = makeRows(1, count);
  list.items(rows, buildRow);
}

setCount(initialRows);

const renderedRows = () => document.querySelectorAll('#vscroll-host [data-row-id]');

window.__yoyaBench = {
  ops: {
    append(count = 1000) {
      const from = rows.length + 1;
      rows = [...rows, ...makeRows(from, count)];
      list.items(rows, buildRow);
    },
    jumpEnd() {
      const element = list._el;
      element.scrollTop = element.scrollHeight;
      list.check();
    },
    run1k() {
      setCount(1000);
    },
    run10k() {
      setCount(10000);
    },
    run100k() {
      setCount(100000);
    }
  },
  renderedRows: () => renderedRows().length,
  stats: () => ({
    builds: counters.builds,
    logicalRows: rows.length,
    realNodes: host.querySelectorAll('*').length,
    renderedRows: renderedRows().length
  })
};
