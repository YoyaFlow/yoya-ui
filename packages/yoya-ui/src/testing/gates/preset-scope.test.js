/**
 * 预设样式的**身份作用域**门禁（票 15 波 6，替代类名时代的"孤儿 part 选择器"扫描）。
 *
 * 类名退场后，`yoya.ui.css` 里的选择器只有两种合法起点：
 *
 * 1. **组件身份作用域** `[vn~='VXxx'] …` —— 部件也有自己的身份、可以自己起头（部件是独立单元，
 *    见票 19 的 R11 / R12），所以不再有"部件规则必须挂在根类下面"这条约束；
 * 2. **跨组件能力类** `yoya-<feature>`（`yoya-icon` / `yoya-layout` / `yoya-control-clear` …）。
 *
 * 于是这里守两件在存量清零后才成立的硬事：
 *
 * - 预设样式表里**不再出现 `.yoya-component` / `.yoya-v*` 类名选择器**（旧一侧已删，回归即红）；
 * - 每个 `[vn~='VXxx']` 记号都必须是**库内真实声明的身份**（JS 里写过 `vn: 'VXxx'`）——
 *   防的是错字与**死选择器**（组件改名 / 退场后留下一条永远匹配不上的规则）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const libraryDirs = [
  'packages/yoya-core/src/core',
  'packages/yoya-core/src/html',
  'packages/yoya-core/src/svg',
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

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listJsFiles(full));
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

/** 库内 JS 里声明的全部身份（`vn: 'VXxx'`，多值空格分隔）。 */
function declaredIdentities() {
  const identities = new Set();

  for (const dir of libraryDirs) {
    for (const file of listJsFiles(resolve(dir))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bvn\s*:\s*(['"])([\s\S]*?)\1/g)) {
        for (const name of match[2].trim().split(/\s+/)) {
          if (name) identities.add(name);
        }
      }
    }
  }

  return identities;
}

const css = readFileSync(resolve('packages/yoya-ui/src/yoya.ui.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);
const identities = declaredIdentities();
const cssIdentities = [
  ...new Set([...css.matchAll(/\[vn~?=?'?([A-Za-z0-9]+)'?\]/g)].map((m) => m[1]))
];
const classTokens = [...new Set(css.match(/\.yoya-(?:component|v[a-z0-9-]+)/g) ?? [])];

describe('preset style identity scope', () => {
  it('keeps no class-name based component selectors in the preset stylesheet', () => {
    expect(
      classTokens,
      `类名一侧已退场（票 15 波 6）：预设规则一律从 [vn~='VXxx'] 起头，这里是 ${classTokens.join(', ')}`
    ).toEqual([]);
  });

  it('references only identities the library actually declares', () => {
    const unknown = cssIdentities.filter((name) => !identities.has(name)).sort();

    expect(
      unknown,
      `预设样式里的死选择器（这些身份库内没有声明，改名 / 退场后的残留？）：${unknown.join(', ')}`
    ).toEqual([]);
  });
});
