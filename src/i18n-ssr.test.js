// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createI18n, div, i18n, withI18nStringShortcut } from './index.js';
import { renderToString, resolveLocale } from './yoya.ssr.js';

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

describe('resolveLocale', () => {
  it('resolves the locale from the cookie first', () => {
    expect(
      resolveLocale({ cookie: 'theme=dark; yoya-lang=en-US', url: '/home?locale=zh-CN' })
    ).toBe('en-US');
  });

  it('falls back to the query parameter when no cookie matches', () => {
    expect(resolveLocale({ cookie: 'theme=dark', url: '/?locale=zh-CN' })).toBe('zh-CN');
  });

  it('falls back to Accept-Language when cookie and query are missing', () => {
    expect(resolveLocale({ acceptLanguage: 'en-US,en;q=0.9', url: '/home' })).toBe('en-US');
  });

  it('returns the default language when nothing matches', () => {
    expect(resolveLocale({ url: '/home' })).toBe('zh-CN');
    expect(resolveLocale(null, { defaultLanguage: 'en' })).toBe('en');
  });

  it('supports a custom cookie key', () => {
    expect(resolveLocale({ cookie: 'lang=fr' }, { cookieKey: 'lang' })).toBe('fr');
  });

  it('parses the query from a full URL', () => {
    expect(resolveLocale({ url: 'https://example.com/home?locale=zh-CN' })).toBe('zh-CN');
  });
});

describe('renderToString i18n option', () => {
  it('auto-scopes the string shortcut to the request locale', () => {
    const app = () => div((root) => root.span('welcome'.s('welcome')));
    const createLocale = (state) => createI18n({ language: state?.locale || 'zh-CN', messages });

    const zh = renderToString(app, { state: { locale: 'zh-CN' }, i18n: createLocale });
    const en = renderToString(app, { state: { locale: 'en-US' }, i18n: createLocale });

    expect(zh.html).toContain('欢迎');
    expect(en.html).toContain('Welcome');
    expect('welcome'.s('welcome').textContent()).toBe('welcome');
  });

  it('accepts an I18n instance directly', () => {
    const locale = createI18n({ language: 'en-US', messages });
    const app = () => div((root) => root.span('welcome'.s('welcome')));

    const { html } = renderToString(app, { i18n: locale });

    expect(html).toContain('Welcome');
  });
});
