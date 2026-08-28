import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/yoya.ui.css'), 'utf8');
const lines = css.split('\n');

describe('cascade layer contract', () => {
  it('declares the yoya layer before any rule', () => {
    const statement = css.indexOf('@layer yoya;');
    const firstRule = css.indexOf('{');
    expect(statement).toBeGreaterThan(-1);
    expect(statement).toBeLessThan(firstRule);
  });

  it('keeps every preset component rule inside the single yoya layer', () => {
    const opens = (css.match(/@layer yoya \{/g) || []).length;
    expect(opens).toBe(1);

    const layerOpenLine = lines.findIndex((line) => line.includes('@layer yoya {'));
    expect(layerOpenLine).toBeGreaterThan(-1);

    const topLevelPresetLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line, index }) => index > layerOpenLine && /^\.yoya-[a-z]/.test(line));
    expect(topLevelPresetLines, 'preset rule outside the layer').toEqual([]);
  });

  it('keeps the token and mode sections before the layer for user overrides', () => {
    const layerOpen = css.indexOf('@layer yoya {');
    expect(css.indexOf(':root')).toBeGreaterThan(-1);
    expect(css.indexOf(':root,')).toBeLessThan(layerOpen);
    expect(css.indexOf('[data-yoya-mode')).toBeGreaterThan(-1);
    expect(css.indexOf('[data-yoya-mode')).toBeLessThan(layerOpen);
  });

  it('applies low-specificity :where() to base component rules', () => {
    const whereCount = (css.match(/:where\(\.yoya-/g) || []).length;
    expect(whereCount).toBeGreaterThan(10);
  });
});
