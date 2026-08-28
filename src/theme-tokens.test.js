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
      /\.yoya-vbutton\[data-size='medium'\] \{\s*font-size: var\(--yoya-font-size-base\);\s*min-height: var\(--yoya-control-height-md\);/
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
});
