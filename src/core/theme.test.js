import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getYoyaMode,
  getYoyaTheme,
  initYoyaTheme,
  resolveYoyaMode,
  setYoyaMode,
  setYoyaTheme
} from '../index.js';

afterEach(() => {
  delete document.documentElement.dataset.yoyaMode;
  delete document.documentElement.dataset.yoyaTheme;
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('theme mode API', () => {
  it('sets light, dark and system modes on the document root', () => {
    setYoyaMode('dark');
    expect(document.documentElement.dataset.yoyaMode).toBe('dark');
    expect(getYoyaMode()).toBe('dark');

    setYoyaMode('light');
    expect(document.documentElement.dataset.yoyaMode).toBe('light');

    setYoyaMode('system');
    expect(document.documentElement.dataset.yoyaMode).toBe('system');
  });

  it('falls back to light for unknown modes and reports the default as light', () => {
    setYoyaMode('sepia');
    expect(getYoyaMode()).toBe('light');
    expect(getYoyaMode() || document.documentElement.dataset.yoyaMode).toBe('light');
  });

  it('resolves system mode to the actual light/dark preference', () => {
    setYoyaMode('system');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(resolveYoyaMode()).toBe('dark');

    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(resolveYoyaMode()).toBe('light');
  });

  it('persists and restores the mode through initYoyaTheme', () => {
    setYoyaMode('dark', { persist: true });
    delete document.documentElement.dataset.yoyaMode;

    const state = initYoyaTheme();

    expect(state.mode).toBe('dark');
    expect(document.documentElement.dataset.yoyaMode).toBe('dark');
  });
});

describe('theme name API', () => {
  it('sets, reads and clears the brand theme on the document root', () => {
    setYoyaTheme('violet');
    expect(document.documentElement.dataset.yoyaTheme).toBe('violet');
    expect(getYoyaTheme()).toBe('violet');

    setYoyaTheme('');
    expect(getYoyaTheme()).toBe('');
    expect(document.documentElement.dataset.yoyaTheme).toBeUndefined();
  });

  it('persists and restores the theme name through initYoyaTheme', () => {
    setYoyaTheme('violet', { persist: true });
    delete document.documentElement.dataset.yoyaTheme;

    const state = initYoyaTheme();

    expect(state.theme).toBe('violet');
    expect(document.documentElement.dataset.yoyaTheme).toBe('violet');
  });
});
