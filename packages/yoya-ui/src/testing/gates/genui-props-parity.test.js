/**
 * GenUI 接线对账门禁（票集 `genui-wiring` 票 02）——**声明面与代码面必须对上，只减不增**。
 *
 * 组件在 GenUI 下只有一种可判定的接线方式：
 *
 * - **声明面**：紧邻工厂的 `@genui*` JSDoc —— `@genui.props` 写说明、`@genui.json` 标出
 *   值域是对象 / 数组的位（JSON 位）、`@genui.content` / `@genui.event … callback` 标出
 *   内容位与回调位（它们不经值位归一）；
 * - **代码面**：工厂函数体里的归一调用点 —— 普通位 `asSignal(…)`，JSON 位 `asSignalJson(…)`；
 *   参数里出现、但不在 props 名单里的标识符（`contentNode === null ? initial : null` 这类）
 *   是代码面注入的实例 / 内容位，不进表。
 *
 * 两侧对账四条：**解构出来的位都得归一**（纯透传的键留在 `...rest`，不入表）、
 * **归一了的位都得声明**、**标了 JSON 位就得用 `asSignalJson`**、**用了 `asSignalJson` 就得标 JSON 位**。
 *
 * 现在是扩展期（票 05–11 分批迁移），存量差距冻结在 baseline 里：**数字只能往下走**——
 * 出现新组件、或某个位新冒出来一行差距，测试就红。迁移一刀后用
 * `UPDATE_GENUI_PROPS_BASELINE=1 npx vitest run src/testing/gates/genui-props-parity.test.js`
 * 下调基线。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  extractGenuiDoc,
  extractGenuiWiring,
  extractProps,
  scanNormalizedProps
} from '@yoyaflow/yoya-core/genui/kitgen';
import kitgenConfig from '../../../../../kitgen.config.js';

const BASELINE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../baselines/genui-props-parity-baseline.json'
);

/** 递归列出目录下的组件源文件（不含测试与生成物）。 */
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

const toRepoPath = (file) =>
  file.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, '');

/**
 * 一个工厂的对账结果：declaredOnly = 解构出来却没归一（该留 `...rest` 或补归一）、
 * codeOnly = 归一了却没声明、jsonDeclaredOnly / jsonCodeOnly = JSON 位两侧对不上。
 */
export function analyzeComponentSource(source, factory) {
  const signatureProps = extractProps(source, factory);
  const factoryIndex = source.indexOf(`export function ${factory}(`);
  const shortcutIndex = source.indexOf(`export const ${`v${factory.slice(1)}`} =`);
  const doc =
    extractGenuiDoc(source, factoryIndex) ??
    (shortcutIndex >= 0 ? extractGenuiDoc(source, shortcutIndex) : null);
  const wiring =
    extractGenuiWiring(source, factoryIndex) ??
    (shortcutIndex >= 0 ? extractGenuiWiring(source, shortcutIndex) : null);
  const declared = new Set([
    ...Object.keys(signatureProps ?? {}),
    ...Object.keys(doc?.props ?? {})
  ]);

  // 内容位 / 回调位 / 命令通道位不经值位归一，不进对账
  const excluded = new Set(['children']);
  const contentProp = wiring?.childrenProp;

  if (contentProp) {
    excluded.add(contentProp);
  }

  for (const event of Object.values(wiring?.events ?? {})) {
    if (event?.channel === 'callback' && event.prop) {
      excluded.add(event.prop);
    }
  }

  for (const [name, binding] of Object.entries(wiring?.props ?? {})) {
    if (typeof binding === 'object' && binding?.live === false) {
      excluded.add(name);
    }
  }

  const declaredValue = [...declared].filter((name) => !excluded.has(name));
  const declaredValueSet = new Set(declaredValue);
  const scanned = scanNormalizedProps(source, factory, { declared: [...declared] });
  // 内容位 / 回调位 / 命令通道位在代码面同样不参与值位对账（它们也能被读到，但不是值通道）
  const code = scanned.props.map((entry) => entry.name).filter((name) => !excluded.has(name));
  const codeSet = new Set(code);
  const jsonDeclared = (doc?.jsonProps ?? []).filter((name) => declaredValueSet.has(name));
  const jsonCode = scanned.props
    .filter((entry) => entry.kind === 'json')
    .map((entry) => entry.name)
    .filter((name) => declaredValueSet.has(name));
  // 归一了、既没声明也不是代码面注入的名字 = "多出来的位"
  const codeOnly = scanned.undeclared.filter((name) => !excluded.has(name));
  const mixed = scanned.props.filter((entry) => entry.kind === 'mixed').map((entry) => entry.name);

  return {
    declared,
    declaredValue,
    code,
    injected: scanned.injected,
    jsonDeclared,
    jsonCode,
    mixed,
    problems: {
      declaredOnly: declaredValue.filter((name) => !codeSet.has(name)),
      codeOnly,
      jsonDeclaredOnly: jsonDeclared.filter((name) => !jsonCode.includes(name)),
      jsonCodeOnly: jsonCode.filter((name) => !jsonDeclared.includes(name)),
      mixed
    }
  };
}

/** 全仓扫描：`文件#VXxx` → 非空差距清单。 */
export function collectParityProblems() {
  const problems = {};
  const componentDirs = Object.entries(kitgenConfig.categories ?? {})
    .filter(([, category]) => category !== null)
    .map(([directory]) => join(kitgenConfig.src, directory));

  for (const dir of componentDirs) {
    const absolute = resolve(dir);
    const files = statSync(absolute, { throwIfNoEntry: false })?.isDirectory()
      ? listSourceFiles(absolute)
      : [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');

      for (const match of source.matchAll(/export function (V[A-Z]\w*)\s*\(/g)) {
        const { problems: found } = analyzeComponentSource(source, match[1]);
        const nonEmpty = Object.fromEntries(
          Object.entries(found).filter(([, names]) => names.length > 0)
        );

        if (Object.keys(nonEmpty).length > 0) {
          problems[`${toRepoPath(file)}#${match[1]}`] = nonEmpty;
        }
      }
    }
  }

  return problems;
}

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

describe('GenUI 接线对账（声明 ↔ 代码，只减不增）', () => {
  const actual = collectParityProblems();

  it('声明面与代码面的差距与基线一致：新差距当场红，迁移后下调基线', () => {
    const baseline = readBaseline();

    if (process.env.UPDATE_GENUI_PROPS_BASELINE === '1') {
      // 一个位一行，Review 时看得清"还剩哪些没迁"（生成物，已在 .prettierignore 里豁免）
      writeFileSync(BASELINE_FILE, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
      console.log(`GenUI 接线对账基线已写入 ${BASELINE_FILE}（${Object.keys(actual).length} 条）`);
      return;
    }

    const unexpected = Object.entries(actual).flatMap(([key, lists]) => {
      const known = baseline[key];

      if (!known) {
        return [`${key}：新组件不在基线里（声明与代码必须先对上，或显式登记进 baseline）`];
      }

      return Object.entries(lists)
        .filter(([kind, names]) => names.some((name) => !(known[kind] ?? []).includes(name)))
        .map(([kind, names]) => `${key} · ${kind}：多出 ${names.join(', ')}`);
    });

    expect(
      unexpected,
      '声明面与代码面对不上（只减不增）——要么补 `@genui.props` / `@genui.json`，要么把位归一或留在 `...rest`'
    ).toEqual([]);
  });

  it('门禁自己会红：解构了没归一、归一了没声明、JSON 位用错原语都抓得到', () => {
    const source = `/**
 * @genui 探针
 * @genui.props {"series":"JSON｜行数据","label":"文本"}
 * @genui.json series
 */
export function VProbe({ series, label, idle, ...rest }) {
  const seriesState = asSignal(label);
  const idleState = asSignalJson(idle);
  const strayState = asSignalJson(stray);
  return div({ vn: 'VProbe', ...rest });
}
export const vProbe = createComponentShortcut(VProbe);
`;
    const { problems } = analyzeComponentSource(source, 'VProbe');

    // 解构了却没归一 / 归一了却没声明 / 标了 JSON 位却用 asSignal / 没标却用 asSignalJson
    expect(problems.declaredOnly).toEqual(['series']);
    expect(problems.codeOnly).toEqual(['stray']);
    expect(problems.jsonDeclaredOnly).toEqual(['series']);
    expect(problems.jsonCodeOnly).toEqual(['idle']);
    expect(problems.mixed).toEqual([]);
  });

  it('真实组件抽查：代码面注入的实例 / 内容位不进对账表，内容位也不算"没归一的位"', () => {
    const badge = readFileSync('packages/yoya-ui/src/data-display/badge.js', 'utf8');
    const analysis = analyzeComponentSource(badge, 'VBadge');

    // `contentNode` / `initialContent` 是组件自己算出来的实例与内容：进 injected，不进 props
    expect(analysis.injected).toEqual(expect.arrayContaining(['contentNode', 'initialContent']));
    expect(analysis.code).not.toContain('contentNode');
    // `children` 是内容位：即使在签名里解构，也不要求走值位归一
    expect(analysis.declared.has('children')).toBe(true);
    expect(analysis.declaredValue).not.toContain('children');
    expect(analysis.problems.declaredOnly).not.toContain('children');
  });
});
