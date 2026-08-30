import { describe, expect, it } from 'vitest';
import { initYoyaTheme } from './index.js';

describe('theme state restore', () => {
  it('restores mode and theme from serialized request context', () => {
    const state = { locale: 'zh-CN', mode: 'dark', theme: 'ocean' };

    initYoyaTheme({ mode: state.mode, theme: state.theme });

    expect(document.documentElement.getAttribute('data-yoya-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-yoya-theme')).toBe('ocean');
  });
});
