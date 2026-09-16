// keyed 行级更新基准：对比「整行重建（默认档）」与中间档
// （`equals` 等价比较跳过重建 / `update` 原地更新入口）的耗时与重建行数。
//
// 用法：npm run bench:keyed    （可选：--rows 500 --rounds 20）
// 不进 CI：只用来记录收益，不做阈值断言（阈值见 verify:dist 的体积预算）。
import { JSDOM } from 'jsdom';
import { li, ref, ul, vText } from '../src/index.js';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? Number(args[index + 1]) : fallback;
};

const SIZE = readArg('rows', 500);
const ROUNDS = readArg('rounds', 20);

// 需要真实 DOM：整行重建会走 createElement / destroy 这条路径。
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;

function createRows(size) {
  return Array.from({ length: size }, (_, index) => ({ id: index, title: `row-${index}` }));
}

function run(mode) {
  const rows = ref(createRows(SIZE));
  const titles = new Map();
  let builds = 0;
  let equalsHits = 0;
  let updates = 0;

  const options =
    mode === 'rebuild'
      ? null
      : {
          equals: (prev, next) => {
            const same = prev.title === next.title;
            if (same) {
              equalsHits += 1;
            }
            return same;
          },
          ...(mode === 'update'
            ? {
                update: (node, prev, next) => {
                  updates += 1;
                  titles.get(next.id).value = next.title;
                  return node;
                }
              }
            : {})
        };

  const list = ul((node) => {
    const buildRow = (row) => {
      builds += 1;
      const title = ref(row.title);
      titles.set(row.id, title);
      return li((item) => item.child(vText(title)));
    };

    if (options) {
      node.keyed(rows, (row) => row.id, buildRow, options);
    } else {
      node.keyed(rows, (row) => row.id, buildRow);
    }
  });

  const element = list.renderDom();
  globalThis.document.body.appendChild(element);
  const firstRowNode = list.children()[0];
  const buildsAfterMount = builds;

  const started = performance.now();
  for (let round = 0; round < ROUNDS; round += 1) {
    // 每轮整批换新引用，其中第 1 行内容真的变了（其余内容等价）
    rows.value = createRows(SIZE).map((row) =>
      round % 2 === 0 && row.id === 0 ? { ...row, title: `row-0-${round}` } : row
    );
  }
  const elapsed = performance.now() - started;

  const keptIdentity = list.children()[0] === firstRowNode;
  element.remove();

  return {
    mode,
    builds: builds - buildsAfterMount,
    elapsed,
    equalsHits,
    keptIdentity,
    perRound: elapsed / ROUNDS,
    updates
  };
}

const RESULTS = [
  { mode: 'rebuild', label: '整行重建（默认）' },
  { mode: 'equals', label: 'equals 等价比较' },
  { mode: 'update', label: 'update 原地更新' }
].map((entry) => ({ ...entry, ...run(entry.mode) }));

const baseline = RESULTS[0];
const pad = (value, width) => String(value).padEnd(width);

console.log(
  `\nkeyed 行级更新基准：${SIZE} 行 × ${ROUNDS} 轮（每轮整批换新引用，其中 1 行内容变化）\n`
);
console.log(
  `${pad('路径', 20)}${pad('总耗时', 12)}${pad('每轮', 12)}${pad('重建行数', 12)}${pad('等价命中', 12)}${pad('首行身份', 10)}收益`
);
console.log('-'.repeat(92));
for (const row of RESULTS) {
  const gain = baseline.elapsed / row.elapsed;
  console.log(
    `${pad(row.label, 20)}${pad(`${row.elapsed.toFixed(1)} ms`, 12)}${pad(
      `${row.perRound.toFixed(2)} ms`,
      12
    )}${pad(row.builds, 12)}${pad(row.equalsHits, 12)}${pad(row.keptIdentity ? '保留' : '换新', 10)}${
      row.mode === 'rebuild' ? '—' : `${gain.toFixed(1)}× 更快`
    }`
  );
}
console.log('');
