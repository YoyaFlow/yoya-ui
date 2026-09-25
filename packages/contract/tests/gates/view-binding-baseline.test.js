/**
 * 「状态 → 视图」写法门禁（**只减不增**）——把迁移期间的口径钉成会红的测试。
 *
 * 目标写法（AGENTS.md「状态 → 视图：读值绑定优先」、票 15 §4）：
 * 状态放 `ref`，结构里挂**读值绑定**（`attr(name, () => …)` / `style(name, () => …)` /
 * `toggleClass(name, …)` / `child(vText(() => …))`），命令只改状态；**不搬 DOM、不刷快照**。
 *
 * 迁移期存量的历史写法是「集中快照函数」：`syncXxx()` / `_syncXxx()` 把多处 `attr` / `style` /
 * `replaceChildren` 收在一个函数里，由命令同步调用。它**不是错**（票 15 §11.1 讲的"不刷快照"是
 * 不许"写完再集中刷"，同步调用不算），但它是**读值绑定的反面形状**：
 *
 * - 状态（闭包 / ref）与"状态到视图的映射"被拆到两处，读代码要跳；
 * - 指令式写快照编译路径吃不到，只能整体回落通用路径。
 *
 * 所以这条门禁冻结**每个文件还剩多少个集中快照函数**：
 *
 * - `snapshotFunctions`：本文件里 `syncXxx` 形式的**定义**数量（调用不算、import 不算）；
 * - 新文件（不在基线里）**一个都不许有**；已在基线里的文件只能往下走；
 * - 迁移一刀之后跑 `UPDATE_VIEW_BINDING_BASELINE=1 npx vitest run src/testing/gates/view-binding-baseline.test.js`
 *   下调基线（与 `attribute-migration-baseline.json` 同一套做法）。
 *
 * 注意这是**代理指标**：它盯的是形状，不是语义。真正的验收仍是"状态改完当拍 DOM 就对"
 * （见 docs/component-authoring.md 的对照样例）。示例 / 演示（`examples`）按票 15 §3-Q11
 * 在波 6 统一处理，不在这里冻结。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 只看**组件侧**目录：引擎内部（`packages/yoya-core/src/core` / `packages/yoya-core/src/html` / `packages/yoya-core/src/svg`）的 `syncXxx` 是引擎自己的
 * 内部对账函数，不在此门禁范围内（也免得给引擎改动添无谓摩擦）。
 */
const componentDirs = [
  'packages/yoya-ui/src/layout',
  'packages/yoya-ui/src/actions',
  'packages/yoya-ui/src/navigation',
  'packages/yoya-ui/src/feedback',
  'packages/yoya-ui/src/form',
  'packages/yoya-ui/src/data-display',
  'packages/yoya-ui/src/chart',
  'packages/yoya-ui/src/three',
  'packages/yoya-ui/src/async',
  'packages/yoya-ui/src/i18n',
  'packages/yoya-ui/src/router',
  'packages/yoya-ui/src/theme',
  'packages/yoya-ui/src/components',
  'packages/yoya-ui/src/effects'
];

const BASELINE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../baselines/view-binding-baseline.json'
);

/** 只认**定义**：`const syncX = () =>` / `function syncX(` / 对象或类里的 `syncX() {`。 */
const SNAPSHOT_DEFINITION_PATTERNS = [
  /(?:const|let)\s+(_?sync[A-Z]\w*)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/g,
  /function\s+(_?sync[A-Z]\w*)\s*\(/g,
  /^\s*(_?sync[A-Z]\w*)\s*\([^)]*\)\s*\{/gm
];

function listSourceFiles(dir) {
  const out = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
      out.push(full);
    }
  }

  return out;
}

/** 每个库内源文件还剩多少个"集中快照函数"定义。 */
export function snapshotFunctionCounts() {
  const counts = {};

  for (const dir of componentDirs) {
    for (const file of listSourceFiles(resolve(dir))) {
      const key = file.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, '');
      const source = readFileSync(file, 'utf8');
      const names = new Set();

      SNAPSHOT_DEFINITION_PATTERNS.forEach((pattern) => {
        pattern.lastIndex = 0;
        for (const match of source.matchAll(pattern)) {
          names.add(match[1]);
        }
      });

      if (names.size > 0) {
        counts[key] = names.size;
      }
    }
  }

  return counts;
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return { snapshotFunctions: {} };
  }
}

describe('状态 → 视图门禁（只减不增）', () => {
  it('集中快照函数只减不增：新文件一个都不许有', () => {
    const baseline = readBaseline();
    const actual = snapshotFunctionCounts();

    if (process.env.UPDATE_VIEW_BINDING_BASELINE === '1') {
      writeFileSync(
        BASELINE_FILE,
        `${JSON.stringify({ snapshotFunctions: actual }, null, 2)}\n`,
        'utf8'
      );
      console.log(`状态 → 视图基线已写入 ${BASELINE_FILE}`);
      return;
    }

    const added = Object.keys(actual).filter((file) => !(file in baseline.snapshotFunctions));

    expect(
      added,
      '这些文件新增了集中快照函数：新代码请改走读值绑定（ref + attr/style/vText 的零参闭包），' +
        '命令只改状态；见 AGENTS.md「状态 → 视图：读值绑定优先」与票 15 §4'
    ).toEqual([]);

    const grown = Object.entries(actual).filter(
      ([file, count]) => count > (baseline.snapshotFunctions[file] ?? 0)
    );

    expect(grown, '集中快照函数比基线更多了（只减不增）').toEqual([]);
  });
});
