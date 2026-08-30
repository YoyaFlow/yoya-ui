// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createI18n, div, i18n, withI18nStringShortcut } from './index.js';
import { renderToString } from './yoya.ssr.js';

const messages = {
  'zh-CN': { greeting: '你好 {name}', welcome: '欢迎' },
  'en-US': { greeting: 'Hello {name}', welcome: 'Welcome' }
};

function createApp(initial = {}) {
  const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
  return div((root) => root.span(locale.t('welcome')));
}

describe('per-request i18n', () => {
  it('renders with the request locale without touching the shared instance', () => {
    i18n.setLanguage('en-US');

    const zh = renderToString(createApp, { state: { locale: 'zh-CN' } });
    const en = renderToString(createApp, { state: { locale: 'en-US' } });

    expect(zh.html).toContain('欢迎');
    expect(en.html).toContain('Welcome');
    expect(i18n.getLanguage()).toBe('en-US');
  });

  it('supports params in per-request translations', () => {
    const app = (initial = {}) => {
      const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
      return div((root) => root.span(locale.t('greeting', { name: 'Codex' })));
    };

    const { html } = renderToString(app, { state: { locale: 'zh-CN' } });

    expect(html).toContain('你好 Codex');
  });

  it('scopes the string shortcut to the request instance', () => {
    const app = (initial = {}) => {
      const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
      return withI18nStringShortcut(locale, () => div((root) => root.span('welcome'.s('welcome'))));
    };

    const zh = renderToString(app, { state: { locale: 'zh-CN' } });
    const en = renderToString(app, { state: { locale: 'en-US' } });

    expect(zh.html).toContain('欢迎');
    expect(en.html).toContain('Welcome');

    expect('welcome'.s('welcome').textContent()).toBe('welcome');
  });
});
