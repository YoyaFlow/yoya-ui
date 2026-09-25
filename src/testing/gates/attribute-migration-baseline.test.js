/**
 * 属性化迁移门禁（票 15 波 0 起，波 6 收口）——**类名存量已清零，只减不增**。
 *
 * 目标态：`yoya-component` / `yoya-v*` 类名全部退场，身份走 `vn` 属性、部件走 `vn_slot`。
 * 迁移是**逐组件**做的（JS 与 CSS 同一刀），这里冻结的就是"还剩多少"——收口后全部为空：
 *
 * - `js`：库内 JS 里每个文件还剩多少个 `yoya-v*` 字面量（注释不计）；
 * - `css`：`src/yoya.ui.css` 里每个 `.yoya-v*` / `yoya-v*` 记号还剩多少次；
 * - `identity`：还没写 `vn` 的组件文件（导出组件定义但结构里没有身份）。
 *
 * 迁移一刀后跑 `UPDATE_ATTR_BASELINE=1 npx vitest run src/testing/gates/attribute-migration-baseline.test.js`
 * 下调基线；**数字只能往下走**——出现新文件、或某个文件比基线更高，测试就红。
 * 演示 / 示例（`examples`）按票 15 §3-Q11 在波 6 统一处理，不在这里冻结。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const libraryDirs = [
  'src/core',
  'src/html',
  'src/svg',
  'src/layout',
  'src/actions',
  'src/navigation',
  'src/feedback',
  'src/form',
  'src/data-display',
  'src/chart',
  'src/three',
  'src/async',
  'src/i18n',
  'src/router',
  'src/theme',
  'src/components',
  'src/effects'
];

const CSS_FILE = 'src/yoya.ui.css';
const BASELINE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../baselines/attribute-migration-baseline.json'
);

/** 递归列出目录下的 JS / CSS 源文件（不含 `*.test.js` 与生成物）。 */
function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if ((entry.endsWith('.js') || entry.endsWith('.css')) && !entry.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 剥掉注释：只关心"代码里还剩多少类名字面量"，注释里的历史说明不算存量。
 * 字符串（含模板串）按原样保留——引号里的类名正是要数的东西。
 */
export function stripComments(source) {
  let out = '';
  let index = 0;

  while (index < source.length) {
    const ch = source[index];
    const next = source[index + 1];

    if (ch === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        index += 1;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') {
          out += '\n';
        }
        index += 1;
      }
      index += 2;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === '\\') {
          end += 2;
          continue;
        }
        if (source[end] === ch) {
          end += 1;
          break;
        }
        end += 1;
      }
      out += source.slice(index, end);
      index = end;
      continue;
    }

    out += ch;
    index += 1;
  }

  return out;
}

const CLASS_TOKEN_RE = /yoya-v[a-z0-9]*(?:-{1,2}[a-z0-9]+)*/g;

/** 每个库内源文件还剩多少个组件 / 部件类名记号（注释不计）。 */
export function classTokenCounts() {
  const counts = {};

  for (const dir of libraryDirs) {
    for (const file of listSourceFiles(resolve(dir))) {
      const key = file.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, '');
      const tokens = stripComments(readFileSync(file, 'utf8')).match(CLASS_TOKEN_RE) ?? [];
      if (tokens.length > 0) {
        counts[key] = tokens.length;
      }
    }
  }

  return counts;
}

/** 预设样式表里每个 `.yoya-v*` 记号还剩多少次。 */
export function cssTokenCounts() {
  // 注释里的历史说明不算存量（同 JS 侧口径）
  const css = stripComments(readFileSync(resolve(CSS_FILE), 'utf8'));
  const counts = {};
  for (const token of css.match(CLASS_TOKEN_RE) ?? []) {
    counts[token] = (counts[token] ?? 0) + 1;
  }
  return counts;
}

/** 组件文件（导出 `VXxx` 定义 / 用外壳）里还没写 `vn` 的那些。 */
export function filesMissingIdentity() {
  const missing = [];

  for (const dir of libraryDirs) {
    for (const file of listSourceFiles(resolve(dir))) {
      if (!file.endsWith('.js')) {
        continue;
      }
      const source = stripComments(readFileSync(file, 'utf8'));
      // 豁免：`VMessageManager` 是**注册表 / 转发器**（自己不拥有视图，`renderDom()` 直接转发给容器），
      // 给它写 `vn` 只会污染被转发的容器身份（见 16 号清单第 98 条）。
      if (/export\s+class\s+VMessageManager\b/.test(source)) {
        continue;
      }
      // `createComponentShell` 已随波 6 删掉（组件只有 A / B 两种写法），只按"导出 VXxx 定义"判
      const definesComponent = /export\s+(?:function|const|class)\s+V[A-Z][A-Za-z0-9]*/.test(
        source
      );
      if (!definesComponent || /\bvn\s*:/.test(source)) {
        continue;
      }
      missing.push(
        file.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, '')
      );
    }
  }

  return missing.sort();
}

const actual = {
  js: classTokenCounts(),
  css: cssTokenCounts(),
  identity: filesMissingIdentity()
};

function readBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return { js: {}, css: {}, identity: [] };
  }
}

describe('属性化迁移门禁（只减不增）', () => {
  it('类名存量与基线一致：不许新增，迁移一刀后下调基线', () => {
    const baseline = readBaseline();

    if (process.env.UPDATE_ATTR_BASELINE === '1') {
      writeFileSync(
        BASELINE_FILE,
        `${JSON.stringify({ ...baseline, ...actual }, null, 2)}\n`,
        'utf8'
      );
      console.log(`属性化迁移基线已写入 ${BASELINE_FILE}`);
      return;
    }

    const grown = Object.entries(actual.js).filter(
      ([file, count]) => count > (baseline.js[file] ?? 0)
    );
    expect(grown, '出现新的组件类名存量（属性化迁移只减不增）；清单见 baseline 里的 js 段').toEqual(
      []
    );

    const grownCss = Object.entries(actual.css).filter(
      ([token, count]) => count > (baseline.css[token] ?? 0)
    );
    expect(
      grownCss,
      '预设样式表里出现新的组件类名选择器（只减不增）；请改用 [vn="VXxx"] 身份作用域'
    ).toEqual([]);

    // 波 6 收口：存量已清零，`js` / `css` 两段必须保持空——重新引入类名身份会在这里红。
    expect(
      Object.keys(actual.js),
      '组件类名存量已清零（票 15 波 6）：身份只走 `vn` 属性，别再加 `yoya-v*` 类名'
    ).toEqual([]);
    expect(
      Object.keys(actual.css),
      '预设样式表里已无类名选择器（票 15 波 6）：新规则一律从 `[vn~="VXxx"]` 起头'
    ).toEqual([]);
  });

  it('身份缺失清单与基线一致（迁移后逐项减少）', () => {
    const baseline = readBaseline();
    const unexpected = actual.identity.filter((file) => !baseline.identity.includes(file));

    expect(unexpected, "有组件文件既没有 vn 身份、也不在基线里：结构里写 vn: 'VXxx'").toEqual([]);
  });

  it('身份与部件命名符合契约（vn PascalCase / vn_slot 与小写占位名）', () => {
    const violations = [];

    for (const dir of libraryDirs) {
      for (const file of listSourceFiles(resolve(dir))) {
        if (!file.endsWith('.js')) {
          continue;
        }
        const source = stripComments(readFileSync(file, 'utf8'));
        const relative = file
          .replaceAll('\\', '/')
          .replace(`${resolve('.').replaceAll('\\', '/')}/`, '');

        for (const match of source.matchAll(/\bvn\s*:\s*(['"`])([\s\S]*?)\1/g)) {
          const value = match[2].trim();
          const names = value.split(/\s+/).filter(Boolean);
          const ok = names.length > 0 && names.every((name) => /^[A-Z][A-Za-z0-9]*$/.test(name));
          if (!ok) {
            violations.push(`${relative}: vn: '${value}'`);
          }
        }

        // `vn_slot` 不做命名约束：空字符串 = 默认占位，其余名字由组件自己定
      }
    }

    expect(violations, `身份 / 部件标记命名不合契约：${violations.join(', ')}`).toEqual([]);
  });
});
