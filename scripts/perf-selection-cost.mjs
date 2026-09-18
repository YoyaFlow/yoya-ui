// 「共享句柄 × 每行派生」在大列表上的退化量化：同一份行结构，三种选中态写法并排比较。
//
//   shared    —— 每行 `computed(() => selectedId.value === row.id)`，切换时写 1 个共享句柄（会唤醒全部 N 行）
//   ownDerive —— 同样是每行一个 computed，但派生读「行自己的」句柄，切换时写两行
//   ownFlag   —— 行自己持一个 ref 布尔（不建派生），切换时写两行
//
// shared 与 ownDerive 的每行对象图完全一样，差别只在「一次写入唤醒多少行」；
// ownDerive 与 ownFlag 的差别是「每行多一个派生」本身的开销。
//
// 用途：docs/component-authoring(.zh-CN).md 与 skills/yoya-ui/references/state.md 里
// 「大列表选中」那一节的数字由这个脚本产出，改实现后请重跑核对。
//
// 用法：npm run perf:selection   （可加 --rows=1000,10000 --rounds=15）
import { JSDOM } from 'jsdom';

const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const rowCounts = option('rows', '1000,10000')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const rounds = Number(option('rounds', '15'));

const dom = new JSDOM('<!doctype html><div id="host"></div>', {
  pretendToBeVisual: true,
  url: 'http://localhost/'
});
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) {
    try {
      Object.defineProperty(globalThis, key, {
        value: dom.window[key],
        configurable: true,
        writable: true
      });
    } catch {
      // 少数访问器（localStorage 之类）在无 origin 时会抛，跳过即可
    }
  }
}

const { computed, ref, table, tr } = await import('../src/yoya.core.js');

const { document, Element } = dom.window;
let evaluations = 0;
let classWrites = 0;
const classNameDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
Object.defineProperty(Element.prototype, 'className', {
  configurable: true,
  get() {
    return classNameDescriptor.get.call(this);
  },
  set(value) {
    classWrites += 1;
    classNameDescriptor.set.call(this, value);
  }
});
const originalRemoveAttribute = Element.prototype.removeAttribute;
Element.prototype.removeAttribute = function (...rest) {
  if (rest[0] === 'class') {
    classWrites += 1;
  }
  return originalRemoveAttribute.apply(this, rest);
};

/**
 * @param {number} count 行数
 * @param {'shared'|'ownDerive'|'ownFlag'} style
 */
function build(count, style) {
  evaluations = 0;
  const rows = ref([]);
  const sharedId = ref(null);
  const list = Array.from({ length: count }, (_, index) => ({ id: index + 1 }));
  const flags = new Map();

  const view = table((node) => {
    node.tbody((body) => {
      body.keyed(
        rows,
        (row) => row.id,
        (row) => {
          const own = ref(false);
          flags.set(row.id, own);

          let state = own;
          if (style === 'shared') {
            state = computed(() => {
              evaluations += 1;
              return sharedId.value === row.id;
            });
          } else if (style === 'ownDerive') {
            state = computed(() => {
              evaluations += 1;
              return own.value;
            });
          }

          return tr((line) => {
            line.td((cell) => cell.className('col-md-1').child(String(row.id)));
            line.toggleClass('danger', state);
          });
        }
      );
    });
  });

  document.getElementById('host').replaceChildren(view.renderDom());
  rows.value = list;
  return { list, flags, sharedId, view };
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const report = [];

for (const count of rowCounts) {
  for (const style of ['shared', 'ownDerive', 'ownFlag']) {
    const { list, flags, sharedId, view } = build(count, style);
    const samples = { evaluations: [], ms: [], writes: [] };
    let previousId = null;

    for (let index = 0; index < rounds; index += 1) {
      const target = list[(index * 37) % list.length];
      evaluations = 0;
      classWrites = 0;

      const start = performance.now();
      if (style === 'shared') {
        sharedId.value = target.id;
      } else {
        if (previousId !== null) {
          flags.get(previousId).value = false;
        }
        flags.get(target.id).value = true;
        previousId = target.id;
      }
      const ms = performance.now() - start;

      // flush() 只服务「未激活的绑定」（Node 侧）；浏览器里激活的绑定在写入时就提交了，
      // 这里不把它算进切换成本。
      view.flush();

      samples.evaluations.push(evaluations);
      samples.ms.push(ms);
      samples.writes.push(classWrites);
    }

    report.push({
      rows: count,
      style,
      evaluations: median(samples.evaluations),
      switchMs: Number(median(samples.ms).toFixed(3)),
      domWrites: median(samples.writes)
    });
  }
}

const header = ['rows', 'style', 'derived evaluations', 'switch ms', 'class writes'];
console.log(header.join('\t'));
for (const row of report) {
  console.log([row.rows, row.style, row.evaluations, row.switchMs, row.domWrites].join('\t'));
}
console.log(
  '\n说明：shared = 每行派生比较共享句柄（基准条目写法）；ownDerive = 每行派生读行自己的句柄；' +
    'ownFlag = 行自己持 ref 布尔。切换成本只算写入本身（不含 flush 的子树遍历）。'
);
console.log(
  '内存侧：第一种写法每行多持一个派生对象与一条订阅，比第二种约多 0.2 KB/行（1000 行约 0.2 MB，' +
    '开发期浏览器内存探针口径）。'
);
