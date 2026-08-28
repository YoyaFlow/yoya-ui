import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/yoya.ui.css'), 'utf8');

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
    expect(css).toMatch(
      /--yoya-color-primary:\s*light-dark\(\s*var\(--yoya-raw-primary\),\s*color-mix/
    );
    expect(css).toMatch(/--yoya-color-primary-hover:\s*light-dark\(\s*color-mix\(/);
    expect(css).toMatch(/--yoya-color-primary-ring:\s*color-mix\(/);
    expect(css).toMatch(/--yoya-color-primary-(hover|active|subtle|border):[^;]*color-mix/s);
  });

  it('defines every color once and removes the duplicated dark blocks', () => {
    expect((css.match(/--yoya-color-bg:/g) || []).length).toBe(1);
    expect((css.match(/--yoya-color-primary:/g) || []).length).toBe(1);
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('supports light, dark and system modes through color-scheme', () => {
    expect(css).toMatch(/:root \{\s*color-scheme: light;\s*\}/);
    expect(css).toMatch(/\[data-yoya-mode='dark'\] \{\s*color-scheme: dark;\s*\}/);
    expect(css).toMatch(/\[data-yoya-mode='system'\] \{\s*color-scheme: light dark;\s*\}/);
    expect(css).toContain('--yoya-color-bg: light-dark(');
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
