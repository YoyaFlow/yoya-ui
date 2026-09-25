import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('packages/yoya-ui/src/yoya.ui.css'), 'utf8');

// ---- 分层取词（票 01 / D5）：主层是唯一真源，兜底层是它的纯值替身 -----------------

/** 按括号配对取出块体（不含两端花括号）。 */
function bodyOf(text, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(openBraceIndex + 1, i);
    }
  }
  throw new Error('括号不平衡：样式表结构可能被改坏了');
}

/** 找第一处匹配选择器的块体。 */
function bodyMatching(text, pattern) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`找不到匹配 ${pattern} 的规则块`);
  return bodyOf(text, text.indexOf('{', match.index));
}

/**
 * 一段 CSS 里的 `--yoya-*` 声明（名 → 值，后写覆盖）。
 * 用声明正则而不是按 `;` 切分：块体里可能嵌套着内层规则（例如 `@media` 里的选择器），
 * 切分会把第一条声明连在选择器后面一起吞掉。
 */
function declarationsOf(text) {
  const out = new Map();
  for (const match of text.matchAll(/(--yoya-[\w-]+)\s*:\s*([^;]+);/g)) {
    out.set(match[1], match[2].trim().replace(/\s+/g, ' '));
  }
  return out;
}

const primaryTokenBlock = bodyMatching(css, /:root\s*,\s*\[data-yoya-theme\]\s*\{/);
const primaryDeclarations = declarationsOf(primaryTokenBlock);

/** 主层里依赖 `light-dark()` / `color-mix()` 的 token —— 兜底层必须逐个补齐。 */
const derivedTokens = [...primaryDeclarations]
  .filter(([, value]) => /light-dark\(|color-mix\(/.test(value))
  .map(([name]) => name)
  .sort();

const fallbackStart = css.indexOf('@supports not (');
const fallbackLayer = fallbackStart < 0 ? '' : bodyOf(css, css.indexOf('{', fallbackStart));
const fallbackLight = fallbackLayer
  ? declarationsOf(bodyMatching(fallbackLayer, /:root\s*,\s*\[data-yoya-theme\]\s*\{/))
  : new Map();
const fallbackDark = fallbackLayer
  ? declarationsOf(bodyMatching(fallbackLayer, /\[data-yoya-mode='dark'\]\s*\{/))
  : new Map();
const fallbackSystem = fallbackLayer
  ? declarationsOf(bodyMatching(fallbackLayer, /@media \(prefers-color-scheme: dark\)\s*\{/))
  : new Map();

const names = (map) => [...map.keys()].sort();

describe('theme token contract', () => {
  it('registers a raw brand palette that other tokens derive from', () => {
    const rawCount = (css.match(/@property --yoya-raw-/g) || []).length;
    expect(rawCount).toBeGreaterThanOrEqual(5);
    for (const brand of ['primary', 'success', 'danger', 'warning', 'info']) {
      expect(new RegExp(`@property --yoya-raw-${brand} \\{\\s*syntax: '<color>';`).test(css)).toBe(
        true
      );
      expect(css).toContain(`--yoya-raw-${brand}:`);
    }
  });

  it('derives brand variants from the raw palette instead of hand-written hex', () => {
    // 口径收窄到**主层**（票 01 / D5）：兜底层是登记在案的豁免，它只能写纯值。
    expect(primaryTokenBlock).toMatch(
      /--yoya-color-primary:\s*light-dark\(\s*var\(--yoya-raw-primary\),\s*color-mix/
    );
    expect(primaryTokenBlock).toMatch(/--yoya-color-primary-hover:\s*light-dark\(\s*color-mix\(/);
    expect(primaryTokenBlock).toMatch(/--yoya-color-primary-ring:\s*color-mix\(/);
    expect(primaryTokenBlock).toMatch(
      /--yoya-color-primary-(hover|active|subtle|border):[^;]*color-mix/s
    );
  });

  it('defines every color once in the primary layer and removes the duplicated dark blocks', () => {
    expect((primaryTokenBlock.match(/--yoya-color-bg:/g) || []).length).toBe(1);
    expect((primaryTokenBlock.match(/--yoya-color-primary:/g) || []).length).toBe(1);
    // 主层不用 prefers-color-scheme：明暗由 color-scheme + light-dark() 驱动。
    expect(primaryTokenBlock).not.toContain('prefers-color-scheme');
  });

  it('supports light, dark and system modes through color-scheme', () => {
    expect(css).toMatch(/:root \{\s*color-scheme: light;\s*\}/);
    expect(css).toMatch(/\[data-yoya-mode='dark'\] \{\s*color-scheme: dark;\s*\}/);
    expect(css).toMatch(/\[data-yoya-mode='system'\] \{\s*color-scheme: light dark;\s*\}/);
    expect(primaryTokenBlock).toContain('--yoya-color-bg: light-dark(');
  });

  it('keeps consumer token names stable', () => {
    for (const token of [
      '--yoya-color-primary',
      '--yoya-color-primary-hover',
      '--yoya-color-danger',
      '--yoya-color-surface',
      '--yoya-color-border',
      '--yoya-shadow-md'
    ]) {
      expect(css).toContain(token);
    }
  });
});

describe('non-color token contract', () => {
  it('defines spacing, typography, control, elevation, motion and border tokens', () => {
    for (const token of [
      '--yoya-space-1',
      '--yoya-space-4',
      '--yoya-space-8',
      '--yoya-font-size-sm',
      '--yoya-font-size-lg',
      '--yoya-font-weight-semibold',
      '--yoya-control-height-sm',
      '--yoya-control-height-md',
      '--yoya-control-height-lg',
      '--yoya-z-dropdown',
      '--yoya-z-popover',
      '--yoya-z-overlay',
      '--yoya-z-toast',
      '--yoya-ease-in',
      '--yoya-ease-out',
      '--yoya-ease-in-out',
      '--yoya-motion-slow',
      '--yoya-border-width',
      '--yoya-border-width-strong'
    ]) {
      expect(css).toContain(`${token}:`);
    }
  });

  it('lets components consume the tokens instead of hard-coded sizes', () => {
    expect(css).toMatch(
      /\[vn~='VButton'\]\[data-size='medium'\] \{\s*font-size: var\(--yoya-font-size-base\);\s*min-height: var\(--yoya-control-height-md\);/
    );
  });

  it('derives elevated layers from z-index tokens', () => {
    expect(css).toMatch(/z-index: var\(--yoya-z-popover\);/);
    expect(css).toMatch(/z-index: var\(--yoya-z-dropdown\);/);
  });

  it('respects reduced-motion preferences', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});

describe('density contract', () => {
  it('places the compact density block after the token block so it wins on the document root', () => {
    const tokenBlock = css.indexOf(':root,');
    const densityBlock = css.indexOf("[data-yoya-density='compact']");
    expect(tokenBlock).toBeGreaterThan(-1);
    expect(densityBlock).toBeGreaterThan(tokenBlock);
  });

  it('provides a compact density switch that tightens spacing and controls', () => {
    expect(css).toContain("[data-yoya-density='compact']");
    expect(css).toContain('--yoya-space-3: 10px;');
    expect(css).toContain('--yoya-control-height-sm: 26px;');
    expect(css).toContain('--yoya-control-height-md: 30px;');
    expect(css).toContain('--yoya-control-height-lg: 34px;');
  });

  it('wires vButton data-size rules to the control-size tokens', () => {
    expect(css).toContain("[vn~='VButton'][data-size='small']");
    expect(css).toContain('min-height: var(--yoya-control-height-sm);');
    expect(css).toContain('min-height: var(--yoya-control-height-md);');
    expect(css).toContain('min-height: var(--yoya-control-height-lg);');
  });
});

/**
 * 兼容兜底层（票 01 / D4–D5）。
 *
 * 判据是**不变量**而不是文本：兜底层只准是主层派生 token 的纯值替身——键集逐个相等、
 * 值里不许再出现需要兜底的那两个函数、三个模式块（浅色 / 深色 / system-夜间）互相对齐。
 * 这样「以后新增 token 忘了补兜底」会当场红，而「样式表被重排」不会误报。
 */
describe('cross-browser fallback layer', () => {
  it('is gated on both color functions it replaces', () => {
    expect(fallbackStart).toBeGreaterThan(-1);
    const condition = css.slice(fallbackStart, css.indexOf('{', fallbackStart));
    expect(condition).toMatch(/@supports\s+not\s*\(\s*\(color: light-dark\(/);
    expect(condition).toContain('color-mix(');
  });

  it('covers exactly the tokens whose primary value needs those functions', () => {
    expect(derivedTokens.length).toBeGreaterThan(60);
    expect(names(fallbackLight)).toEqual(derivedTokens);
  });

  it('falls back for the load-bearing surface / text / border tokens', () => {
    for (const token of [
      '--yoya-color-bg',
      '--yoya-color-surface',
      '--yoya-color-text',
      '--yoya-color-border',
      '--yoya-color-primary'
    ]) {
      expect(fallbackLight.get(token), `${token} 必须有纯值兜底`).toMatch(
        /^(#[0-9a-f]{3,8}|rgba?\()/i
      );
    }

    // 深色块必须是深色值（防「复制浅色块」这类事故）。
    expect(fallbackDark.get('--yoya-color-bg')).not.toBe(fallbackLight.get('--yoya-color-bg'));
    expect(fallbackDark.get('--yoya-color-text')).not.toBe(fallbackLight.get('--yoya-color-text'));
  });

  it('keeps every fallback value plain (no light-dark / color-mix / var)', () => {
    const offenders = [];
    for (const [name, value] of [...fallbackLight, ...fallbackDark, ...fallbackSystem]) {
      if (/light-dark\(|color-mix\(|var\(/.test(value)) offenders.push(name);
    }
    expect(offenders, `兜底层里不允许出现需要兜底的函数：${offenders.join(', ')}`).toEqual([]);
  });

  it('covers dark and system modes with the same key set', () => {
    expect(names(fallbackDark)).toEqual(derivedTokens);
    expect(names(fallbackSystem)).toEqual(derivedTokens);
    expect(fallbackLayer).toContain('@media (prefers-color-scheme: dark)');
  });

  it('keeps the two dark copies in sync (system-night vs explicit dark)', () => {
    const drift = [...fallbackDark.keys()].filter(
      (name) => fallbackSystem.get(name) !== fallbackDark.get(name)
    );
    expect(drift, `system 夜间块与深色块不一致：${drift.join(', ')}`).toEqual([]);
  });
});
