// yoya-ui 核心基准参考实现（keyed）。
// 写法就是惯用写法：行数据是 ref 句柄，列表 keyed 对账，字段更新走句柄原地写。
// variant=component 时改用官方表格组件（vTable / vTr / vTd），用于组件层开销对照。
import {
  computed,
  hydrateOrMount,
  ref,
  table,
  tr,
  vTable,
  vText,
  vTr
} from '/dist/yoya.ui-router.full.min.js';

const params = new URLSearchParams(location.search);
const variant = params.get('variant') === 'component' ? 'component' : 'native';
const mode = params.get('mode') === 'ssr' ? 'ssr' : 'client';

const rows = ref([]);
const selectedId = ref(null);
const counters = { builds: 0, removals: 0 };

const labelOf = (id) => `label ${id}`;

function makeRows(from, count) {
  const list = [];
  for (let index = 0; index < count; index += 1) {
    const id = from + index;
    list.push({ id, label: ref(labelOf(id)) });
  }
  return list;
}

function removeRow(id) {
  counters.removals += 1;
  rows.value = rows.peek().filter((row) => row.id !== id);
}

function removeIcon(icon, row) {
  icon.className('remove');
  icon.child('×');
  icon.on('click', (event) => {
    event.stopPropagation();
    removeRow(row.id);
  });
}

function bindRowState(line, row) {
  line.toggleClass(
    'danger',
    computed(() => selectedId.value === row.id)
  );
  line.on('click', () => {
    selectedId.value = row.id;
  });
}

function buildNativeRow(row) {
  counters.builds += 1;
  return tr((line) => {
    line.attr('data-row-id', String(row.id));
    line.td((cell) => cell.className('col-md-1').child(String(row.id)));
    line.td((cell) => {
      cell.className('col-md-4');
      cell.a((link) => {
        link.className('lbl');
        link.child(vText(row.label));
      });
    });
    line.td((cell) => {
      cell.className('col-md-1');
      cell.span((icon) => removeIcon(icon, row));
    });
    line.td((cell) => cell.className('col-md-6'));
    bindRowState(line, row);
  });
}

function buildComponentRow(row) {
  counters.builds += 1;
  return vTr((line) => {
    line.attr('data-row-id', String(row.id));
    line.vTd((cell) => cell.className('col-md-1').child(String(row.id)));
    line.vTd((cell) => {
      cell.className('col-md-4');
      cell.a((link) => {
        link.className('lbl');
        link.child(vText(row.label));
      });
    });
    line.vTd((cell) => {
      cell.className('col-md-1');
      cell.span((icon) => removeIcon(icon, row));
    });
    line.vTd((cell) => cell.className('col-md-6'));
    bindRowState(line, row);
  });
}

const buildRow = variant === 'component' ? buildComponentRow : buildNativeRow;

function buildTable() {
  const builder = variant === 'component' ? vTable : table;
  const bodyNode = (body) => {
    body.attr('id', 'tbody');
    body.keyed(
      rows,
      (row) => row.id,
      (row) => buildRow(row)
    );
  };

  return builder((node) => {
    node.className('table table-hover table-striped test-data');
    if (variant === 'component') {
      node.vTbody(bodyNode);
    } else {
      node.tbody(bodyNode);
    }
  });
}

const startup = { mode, readyAt: null, renderMs: null, hydrateMs: null };

if (mode === 'ssr') {
  // 先产出服务端形态的 HTML，再在客户端接管：渲染与接管分开计时
  const rendered = performance.now();
  const markup = buildTable().toHTML();
  startup.renderMs = performance.now() - rendered;

  document.getElementById('table-host').innerHTML = markup;
  const hydrated = performance.now();
  hydrateOrMount(buildTable, { target: '#table-host' });
  startup.hydrateMs = performance.now() - hydrated;
} else {
  buildTable().bindTo('#table-host');
}

startup.readyAt = performance.now();

const rowElements = () => Array.from(document.querySelectorAll('#tbody tr'));
const ids = () => rowElements().map((element) => Number(element.getAttribute('data-row-id')));
const labels = () =>
  rowElements().map((element) => element.querySelector('.lbl')?.textContent ?? '');
const selected = () =>
  rowElements()
    .filter((element) => element.classList.contains('danger'))
    .map((element) => Number(element.getAttribute('data-row-id')));

const ops = {
  run() {
    rows.value = makeRows(1, 1000);
  },
  replace() {
    rows.value = makeRows(1, 1000);
  },
  runlots() {
    rows.value = makeRows(1, 10000);
  },
  add() {
    const last = rows.peek().at(-1)?.id ?? 0;
    rows.value = [...rows.peek(), ...makeRows(last + 1, 1000)];
  },
  update() {
    rows.peek().forEach((row, index) => {
      if (index % 10 === 0) {
        row.label.value = `${labelOf(row.id)} !!!`;
      }
    });
  },
  clear() {
    rows.value = [];
  },
  swaprows() {
    const list = rows.peek();
    if (list.length <= 998) return;
    const next = list.slice();
    next[1] = list[998];
    next[998] = list[1];
    rows.value = next;
  }
};

window.__yoyaBench = {
  ids,
  labels,
  ops,
  rowElements,
  selected,
  startup,
  stats: () => ({ builds: counters.builds, removals: counters.removals, rows: rows.peek().length }),
  variant,
  visibleNodes: () => document.querySelectorAll('#table-host *').length
};

document.getElementById('run').addEventListener('click', ops.run);
document.getElementById('replace').addEventListener('click', ops.replace);
document.getElementById('runlots').addEventListener('click', ops.runlots);
document.getElementById('add').addEventListener('click', ops.add);
document.getElementById('update').addEventListener('click', ops.update);
document.getElementById('clear').addEventListener('click', ops.clear);
document.getElementById('swaprows').addEventListener('click', ops.swaprows);
