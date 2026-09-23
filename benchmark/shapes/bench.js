// keyed 场景基准（在真机浏览器里跑）：**同一份行源码**，一列不挂编译器、一列用真编译产物。
//
//   runtime  —— `row.fixture.js` 的 Row（通用路径：逐节点建）
//   compiled —— `row.compiled.js`（真编译器产物：片段 + adopt + 位置写）
//
// 列表对账（keyed / keySet）两条路共用，差额 = 每行建造成本的差额。
import { div, ref, vText } from '/src/yoya.core.js';
import { adopt, bindChild, cloneFragment } from '/src/compiler/runtime.js';
import { createRowFactory } from './row.compiled.js';
import { Row as runtimeRow } from './row.fixture.js';

const compiledRow = createRowFactory({});

const makeRows = (count, offset = 0) =>
  Array.from({ length: count }, (unused, index) => ({
    id: offset + index + 1,
    label: ref(`row-${offset + index + 1}`),
    selected: ref(false)
  }));

const mountList = (container, rowFactory, rows) => {
  const host = div((node) =>
    node.keyed(
      rows,
      (row) => row.id,
      (row) => rowFactory(row)
    )
  );
  host.bindTo(container);
  return host;
};

/** 每轮先做安静的准备态，再计时跑被测操作；取样本中位数（`inner` 次/样本再摊平）。 */
const timeCase = (rowFactory, options) => {
  const { prepare = null, run, repeats = 5, inner = 1 } = options;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rows = ref([]);
  const host = mountList(container, rowFactory, rows);

  const samples = [];
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    if (prepare) {
      prepare(rows, repeat);
    }
    const started = performance.now();
    for (let index = 0; index < inner; index += 1) {
      run(rows, repeat, index);
    }
    samples.push((performance.now() - started) / inner);
  }

  host.destroy();
  container.remove();
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)];
};

const CASES = [
  {
    name: 'create 1k',
    prepare: (rows) => {
      rows.value = [];
    },
    run: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    repeats: 5,
    rowsPerRun: 1000
  },
  {
    name: 'replace 1k',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000 + 500000);
    },
    repeats: 5,
    rowsPerRun: 1000
  },
  {
    name: 'update every 10th ×16',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows, repeat) => {
      const list = rows.value;
      for (let round = 0; round < 16; round += 1) {
        for (let index = 0; index < list.length; index += 10) {
          list[index].label.value = `u-${repeat}-${round}-${index}`;
        }
      }
    },
    repeats: 5,
    inner: 4
  },
  {
    name: 'select one（交替写）',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows, repeat, index) => {
      rows.value[3].selected.value = index % 2 === 0;
    },
    repeats: 10,
    inner: 200
  },
  {
    name: 'swap two',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows) => {
      const next = [...rows.value];
      const left = next[1];
      next[1] = next[998];
      next[998] = left;
      rows.value = next;
    },
    repeats: 10,
    inner: 50
  },
  {
    name: 'remove one',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows) => {
      rows.value = rows.value.filter((row, index) => index !== 500);
    },
    repeats: 10,
    inner: 20
  },
  {
    name: 'append 1k',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows, repeat) => {
      rows.value = [...rows.value, ...makeRows(1000, repeat * 1000000 + 500000)];
    },
    repeats: 5,
    rowsPerRun: 1000
  },
  {
    name: 'clear 1k',
    prepare: (rows, repeat) => {
      rows.value = makeRows(1000, repeat * 1000000);
    },
    run: (rows) => {
      rows.value = [];
    },
    repeats: 10
  },
  {
    name: 'create 10k',
    prepare: (rows) => {
      rows.value = [];
    },
    run: (rows, repeat) => {
      rows.value = makeRows(10000, repeat * 1000000);
    },
    repeats: 3,
    rowsPerRun: 10000
  }
];

/** 同一次操作跑两条路，再逐字节比 DOM（两条路必须一模一样）。 */
const mountCase = (rowFactory, options) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rows = ref([]);
  const host = mountList(container, rowFactory, rows);
  options.prepare?.(rows, 1);
  options.run(rows, 1, 0);
  const html = container.innerHTML;
  host.destroy();
  container.remove();
  return html;
};

/** keyed 全流程对账：建 → 改文案 → 选中 → 交换 → 删除 → 追加。 */
const runSequence = (rowFactory) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const rows = ref([]);
  const host = mountList(container, rowFactory, rows);

  rows.value = makeRows(200);
  const list = rows.value;
  for (let round = 0; round < 2; round += 1) {
    for (let index = 0; index < list.length; index += 10) {
      list[index].label.value = `seq-${round}-${index}`;
    }
  }
  rows.value[3].selected.value = true;

  const swapped = [...rows.value];
  const left = swapped[1];
  swapped[1] = swapped[150];
  swapped[150] = left;
  rows.value = swapped;

  rows.value = rows.value.filter((row, index) => index !== 100);
  rows.value = [...rows.value, ...makeRows(100, 100000)];

  const html = container.innerHTML;
  host.destroy();
  container.remove();
  return html;
};

/* ---- 票 18 形状：options 里带 `...rest`，编译期把它变成运行期合并 ---- */

const REST_HTML =
  '<div data-tone="">' +
  '<span class="col c-0"><!----></span>' +
  '<span class="col c-1">c1</span>' +
  '<span class="col c-2">c2</span>' +
  '<span class="col c-3">c3</span>' +
  '<span class="col c-4">c4</span>' +
  '</div>';

const restDslRow = (row) =>
  div({ 'data-tone': row.tone, ...row.rest }, (node) => {
    node.span({ class: 'col c-0' }, (cell) => cell.child(vText(row.label)));
    node.span({ class: 'col c-1' }, (cell) => cell.child('c1'));
    node.span({ class: 'col c-2' }, (cell) => cell.child('c2'));
    node.span({ class: 'col c-3' }, (cell) => cell.child('c3'));
    node.span({ class: 'col c-4' }, (cell) => cell.child('c4'));
  });

// 片段里只 bake 身份之外的**普通属性**；`class` 来自 rest，留给运行期那条合并 op
const restTemplateRow = (row) => {
  const el = cloneFragment(REST_HTML);
  const anchor = el.childNodes[0].childNodes[0];
  const node = adopt(
    div((inner) => {
      inner.attr('data-tone', row.tone);
      bindChild(inner, anchor, row.label);
    }),
    el,
    ['data-tone']
  );
  node.setup({ 'data-tone': row.tone, ...row.rest }); // ← 运行期合并 rest 与静态 JSON
  return node;
};

const makeRestRows = (count, offset = 0) =>
  Array.from({ length: count }, (unused, index) => ({
    id: offset + index + 1,
    label: ref(`row-${offset + index + 1}`),
    tone: 'warn',
    rest: { class: 'row', 'data-kind': 'demo' }
  }));

const restMerge = () => {
  const options = {
    prepare: (rows) => {
      rows.value = [];
    },
    run: () => undefined,
    repeats: 3,
    rowsPerRun: 1000
  };
  const runtimeMs = timeCase(restDslRow, {
    ...options,
    run: (rows, repeat) => {
      rows.value = makeRestRows(1000, repeat * 1000000);
    }
  });
  const templateMs = timeCase(restTemplateRow, {
    ...options,
    run: (rows, repeat) => {
      rows.value = makeRestRows(1000, repeat * 1000000);
    }
  });
  const probe = {
    prepare: (rows) => {
      rows.value = [];
    },
    run: (rows) => {
      rows.value = makeRestRows(2);
    }
  };
  return {
    runtimeMs,
    templateMs,
    ratio: templateMs / runtimeMs,
    equal:
      signatureOf(mountCase(restDslRow, probe)) === signatureOf(mountCase(restTemplateRow, probe)),
    sample: mountCase(restDslRow, probe)
  };
};

/** 行规模扫描：同一形状按列数放大（每行 1 个活文本），看比值怎么随规模变。 */
const rowSpec = (columns) => {
  const html =
    '<div class="row" data-id="">' +
    Array.from({ length: columns }, (unused, index) =>
      index === 0
        ? '<span class="col c-0"><!----></span>'
        : `<span class="col c-${index}">c${index}</span>`
    ).join('') +
    '</div>';

  const dsl = (row) =>
    div({ class: 'row', 'data-id': String(row.id) }, (node) => {
      for (let index = 0; index < columns; index += 1) {
        node.span({ class: `col c-${index}` }, (cell) =>
          cell.child(index === 0 ? vText(row.label) : `c${index}`)
        );
      }
    });

  const template = (row) => {
    const el = cloneFragment(html);
    const anchor = el.childNodes[0].childNodes[0];
    return adopt(
      div((node) => {
        node.className('row');
        node.attr('data-id', String(row.id));
        bindChild(node, anchor, row.label);
      }),
      el,
      ['data-id']
    );
  };

  return { html, dsl, template };
};

/** 属性顺序无关对比：解析成 DOM 再逐节点比（属性排序后拼接）。 */
const signatureOf = (html) => {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const walk = (node) => {
    if (node.nodeType === 3) {
      return `#text:${node.textContent}`;
    }
    const attrs = [...node.attributes]
      .map((item) => `${item.name}=${item.value}`)
      .sort()
      .join(' ');
    return `<${node.tagName.toLowerCase()} ${attrs}>${[...node.childNodes].map(walk).join('')}`;
  };
  return [...holder.childNodes].map(walk).join('');
};

const sizeSweep = () => {
  const out = [];
  for (const columns of [4, 8, 16, 32]) {
    const spec = rowSpec(columns);
    const options = {
      prepare: (rows) => {
        rows.value = [];
      },
      run: (rows, repeat) => {
        rows.value = makeRows(1000, repeat * 1000000);
      },
      repeats: 5,
      rowsPerRun: 1000
    };
    out.push({
      columns,
      bytes: spec.html.length,
      runtimeMs: timeCase(spec.dsl, options),
      templateMs: timeCase(spec.template, options),
      sampleDsl: mountCase(spec.dsl, options),
      sampleTemplate: mountCase(spec.template, options)
    });
  }
  return out.map((entry) => ({
    ...entry,
    // 属性顺序无关的签名（class / data-* 的先后在两条路上不同，内容一致）
    equal: signatureOf(entry.sampleDsl) === signatureOf(entry.sampleTemplate),
    ratio: entry.templateMs / entry.runtimeMs
  }));
};

window.__runBench = () => {
  const verify = {};
  CASES.forEach((entry) => {
    verify[entry.name] = {
      runtime: mountCase(runtimeRow, entry),
      compiled: mountCase(compiledRow, entry)
    };
  });

  const sequence = { runtime: runSequence(runtimeRow), compiled: runSequence(compiledRow) };

  // 先跑两个轻量段（规模扫描 / rest 合并），再跑含 10k 的主表，避免 GC 影响小样本
  const sizeSweepResult = sizeSweep();
  const restMergeResult = restMerge();

  const rows = CASES.map((entry) => {
    const runtimeMs = timeCase(runtimeRow, entry);
    const compiledMs = timeCase(compiledRow, entry);
    return {
      name: entry.name,
      runtimeMs,
      compiledMs,
      ratio: compiledMs / runtimeMs,
      rowsPerRun: entry.rowsPerRun ?? null
    };
  });

  const mismatches = Object.entries(verify)
    .filter(([, pair]) => pair.runtime !== pair.compiled)
    .map(([name]) => name);

  return {
    userAgent: navigator.userAgent,
    mismatches,
    sequenceEqual: sequence.runtime === sequence.compiled,
    sequence,
    rows,
    sizeSweep: sizeSweepResult,
    restMerge: restMergeResult
  };
};

window.__benchReady = true;
window.__benchInternals = { runtimeRow, compiledRow, mountList, makeRows, ref };
