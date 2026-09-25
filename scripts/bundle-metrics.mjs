// 产物体积口径的唯一来源（拆包后版本）：按**包 + 公开入口**采集"入口的传递闭包" min+gzip。
//
// 两件事变了，所以口径也重写：
//   1. 产物是 preserveModules 的**模块镜像**，不再有"入口文件 + 公共 chunk + 自包含 .full"；
//   2. core 是独立包 → ui 各入口的闭包把 `@yoyaflow/yoya-core*` 当 external，
//      量出来的是"**在 core 之上**再加多少"，使用者实际下载 = core + 该行。
//
// README 的体积表是**生成块**（`<!-- bundle-sizes:start -->` … `end`），
// `report:bundle:write` 刷新数字，`verify:dist` 按同一份口径核对。
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

export const DIST = {
  core: 'packages/yoya-core/dist',
  ui: 'packages/yoya-ui/dist'
};

const CORE_EXTERNAL = /^@yoyaflow\/yoya-core(\/|$)/;
export const BLOCK_START = '<!-- bundle-sizes:start -->';
export const BLOCK_END = '<!-- bundle-sizes:end -->';

export const BUNDLE_ENTRIES = [
  {
    label: '@yoyaflow/yoya-core',
    pkg: 'core',
    file: 'index.js',
    contents: '节点 / 信号 / HTML·SVG 原语 + i18n·access·context·a11y·theme 原语（自包含）'
  },
  {
    label: '@yoyaflow/yoya-core/api',
    pkg: 'core',
    file: 'api.js',
    contents: '通讯辅助约束：RequestBase / Result / configureRequest'
  },
  {
    label: '@yoyaflow/yoya-core/tools',
    pkg: 'core',
    file: 'tools.js',
    contents: 'a11y / i18n / theme / 组件作者契约原语（core 自包含）'
  },
  {
    label: '@yoyaflow/yoya-ui',
    pkg: 'ui',
    file: 'index.js',
    contents: '全部组件 + layout + router / SSR（core 由 peer 提供）'
  },
  {
    label: '@yoyaflow/yoya-ui/ui',
    pkg: 'ui',
    file: 'ui.js',
    contents: '全部组件 + layout + theme（不含 router / SSR）'
  },
  {
    label: '@yoyaflow/yoya-ui/router',
    pkg: 'ui',
    file: 'router.js',
    contents: 'router + SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount）'
  },
  {
    label: '@yoyaflow/yoya-ui/ssr',
    pkg: 'ui',
    file: 'ssr.js',
    contents: '服务端完整入口：core 原语 + html + layout + router / SSR（core 由 peer 提供）'
  },
  {
    label: '@yoyaflow/yoya-ui/svg',
    pkg: 'ui',
    file: 'svg.js',
    contents: 'SVG 工厂 + 图标集（转发到 core 主入口，同一份实现）'
  },
  {
    label: '@yoyaflow/yoya-ui/tools',
    pkg: 'ui',
    file: 'tools.js',
    contents: 'a11y / i18n / theme / 组件作者契约（转发到 core，peer 提供）'
  },
  {
    label: '@yoyaflow/yoya-ui/dev',
    pkg: 'ui',
    file: 'dev.js',
    contents: 'devtools（转发到 core，peer 提供）'
  },
  {
    label: '@yoyaflow/yoya-ui/actions',
    pkg: 'ui',
    file: 'actions.js',
    contents: 'button / buttons / float-button / 菜单'
  },
  {
    label: '@yoyaflow/yoya-ui/navigation',
    pkg: 'ui',
    file: 'navigation.js',
    contents: 'menu / sidebar / anchor / breadcrumb / steps / tabs'
  },
  {
    label: '@yoyaflow/yoya-ui/feedback',
    pkg: 'ui',
    file: 'feedback.js',
    contents: 'dialog / tooltip / toast / vConfirm'
  },
  {
    label: '@yoyaflow/yoya-ui/form',
    pkg: 'ui',
    file: 'form.js',
    contents: 'input / select / radio / upload / 控件族'
  },
  {
    label: '@yoyaflow/yoya-ui/data-display',
    pkg: 'ui',
    file: 'data-display.js',
    contents: 'table / tree / badge / progress / carousel / 看板族'
  },
  {
    label: '@yoyaflow/yoya-ui/async',
    pkg: 'ui',
    file: 'async.js',
    contents: 'vDynamicLoader / lazy-image'
  },
  {
    label: '@yoyaflow/yoya-ui/echart',
    pkg: 'ui',
    file: 'echart.js',
    contents: 'vEchart（ECharts 封装，自备 echarts）'
  },
  {
    label: '@yoyaflow/yoya-ui/three',
    pkg: 'ui',
    file: 'three.js',
    contents: 'vThree（Three.js 封装，自备 three）'
  },
  {
    label: '@yoyaflow/yoya-ui/compiler-runtime',
    pkg: 'ui',
    file: 'compiler-runtime.js',
    contents: '编译路径的运行期钩子（主入口不含）'
  }
];

export const README_ROW_NAMES = BUNDLE_ENTRIES.map((entry) => entry.label);

const kb = (bytes) => (bytes / 1024).toFixed(1);

/** 入口 + 传递依赖的真实下载量：跟着 dist 的 import 图重打一次并压缩。 */
async function closureSize(entry) {
  const bundle = await rolldown({
    input: join(DIST[entry.pkg], entry.file),
    external: entry.pkg === 'ui' ? [CORE_EXTERNAL] : []
  });
  const { output } = await bundle.generate({ format: 'es', minify: true });
  const code = output.map((chunk) => chunk.code).join('\n');
  return { raw: code.length, gzip: gzipSync(code).length };
}

export async function collectBundleReport() {
  const entries = [];
  for (const entry of BUNDLE_ENTRIES) {
    entries.push({ ...entry, size: await closureSize(entry) });
  }
  const skin = join(DIST.ui, 'yoya.ui.css');
  const css = existsSync(skin)
    ? { raw: statSync(skin).size, gzip: gzipSync(readFileSync(skin)).length }
    : null;
  return { entries, css };
}

export function formatBundleReport(report) {
  const lines = [];
  lines.push('### 入口 min+gzip（core 自包含；ui 各入口把 core 当 external）\n');
  lines.push('| 入口 | 内容 | min+gzip |');
  lines.push('| --- | --- | --- |');
  for (const row of report.entries) {
    lines.push(`| \`${row.label}\` | ${row.contents} | ${kb(row.size.gzip)} KB |`);
  }
  if (report.css) {
    lines.push('');
    lines.push(
      `组件皮肤：\`yoya.ui.css\` ${kb(report.css.raw)} KB raw / ${kb(report.css.gzip)} KB gzip（core 层无皮肤）`
    );
  }
  return lines.join('\n');
}

// ---- README 生成块 -----------------------------------------------------------
const ROW = /^\|\s*`([^`]+)`\s*\|([^|]*)\|\s*([\d.]+) KB\s*\|$/;
// 冒号可能在名字前面（"组件皮肤：`yoya.ui.css` …"）也可能在后面，所以不写死位置
const CSS_VALUE = /`yoya\.ui\.css`[^|\n]*?[\d.]+ KB raw \/ \*{0,2}[\d.]+ KB gzip/;

export function readReadmeSizes(text) {
  const block = /<!-- bundle-sizes:start -->([\s\S]*?)<!-- bundle-sizes:end -->/.exec(text);
  const rows = {};
  if (block) {
    for (const line of block[1].split('\n')) {
      const found = ROW.exec(line.trim());
      if (found) rows[found[1]] = [found[3]];
    }
  }
  const css = CSS_VALUE.exec(text);
  return { rows, css: css ? (css[0].match(/\d+\.\d+/g) ?? []) : null };
}

const SIZE_TOLERANCE_KB = 0.1;
const same = (found, expected) =>
  found.length === expected.length &&
  found.every(
    (value, index) => Math.abs(Number(value) - Number(expected[index])) <= SIZE_TOLERANCE_KB
  );

export function compareReadmeSizes(text, report) {
  const actual = readReadmeSizes(text);
  const mismatches = [];
  for (const row of report.entries) {
    const expected = [kb(row.size.gzip)];
    const found = actual.rows[row.label];
    if (!found) mismatches.push({ name: row.label, expected, actual: null });
    else if (!same(found, expected)) mismatches.push({ name: row.label, expected, actual: found });
  }
  const cssExpected = report.css ? [kb(report.css.raw), kb(report.css.gzip)] : ['-', '-'];
  if (!actual.css) {
    mismatches.push({ name: 'yoya.ui.css raw / gzip', expected: cssExpected, actual: null });
  } else if (!same(actual.css, cssExpected)) {
    mismatches.push({ name: 'yoya.ui.css raw / gzip', expected: cssExpected, actual: actual.css });
  }
  return mismatches;
}

export function patchReadmeSizes(text, report) {
  const block = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
  if (!block.test(text)) {
    throw new Error(`README 缺少体积表生成块（${BLOCK_START} … ${BLOCK_END}）`);
  }
  const lines = [BLOCK_START, '', '| 入口 | 内容 | min+gzip |', '| --- | --- | --- |'];
  for (const row of report.entries) {
    lines.push(`| \`${row.label}\` | ${row.contents} | ${kb(row.size.gzip)} KB |`);
  }
  lines.push('', BLOCK_END);
  let next = text.replace(block, lines.join('\n'));
  if (report.css) {
    const css = CSS_VALUE.exec(next);
    if (!css) throw new Error('README 缺少组件皮肤体积行（yoya.ui.css: X KB raw / Y KB gzip）');
    const numbers = [kb(report.css.raw), kb(report.css.gzip)];
    let index = 0;
    next = next.replace(
      css[0],
      css[0].replace(/\d+\.\d+/g, () => numbers[index++])
    );
  }
  return next;
}
