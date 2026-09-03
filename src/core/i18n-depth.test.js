import { describe, expect, it } from 'vitest';
import { createI18n } from '../index.js';

describe('i18n depth (core)', () => {
  it('resolves ICU plural selection with Intl rules and fallback', () => {
    const locale = createI18n({
      language: 'en',
      messages: {
        en: {
          items: '{count, plural, one {1 item} other {{count} items}}'
        },
        'zh-CN': { items: '{count} 个项目' }
      }
    });
    expect(locale.t('items', { count: 1 })).toBe('1 item');
    expect(locale.t('items', { count: 5 })).toBe('5 items');
    locale.setLanguage('zh-CN');
    expect(locale.t('items', { count: 5 })).toBe('5 个项目');
  });

  it('formats numbers and dates through Intl per locale', () => {
    const locale = createI18n({
      language: 'en',
      messages: {
        en: {
          total: '共 {count, number} 条',
          day: '日期：{day, date, medium}'
        },
        'zh-CN': { total: '共 {count, number} 条' }
      }
    });
    expect(locale.t('total', { count: 1234 })).toContain('1,234');
    expect(locale.t('day', { day: new Date('2026-09-03T00:00:00Z') })).toMatch(/Sep 3|09\/03/);
  });

  it('keeps plain {name} interpolation working', () => {
    const locale = createI18n({ language: 'en', messages: { en: { hi: 'Hello, {name}' } } });
    expect(locale.t('hi', { name: 'Ada' })).toBe('Hello, Ada');
  });

  it('registerLocale lazily loads a language and refreshes subscribers', async () => {
    const locale = createI18n({ language: 'en', messages: { en: { hello: 'Hello' } } });
    let notified = 0;
    locale.subscribe(() => {
      notified += 1;
    });

    await locale.registerLocale('de', () => ({ hello: 'Hallo', bye: 'Tschüss' }));
    locale.setLanguage('de');
    expect(locale.t('hello')).toBe('Hallo');
    expect(locale.t('bye')).toBe('Tschüss');
    expect(notified).toBeGreaterThanOrEqual(1);
  });

  it('registerLocale supports async loader returning a Promise', async () => {
    const locale = createI18n({ language: 'fr', messages: {} });
    await locale.registerLocale('fr', () => Promise.resolve({ hello: 'Bonjour' }));
    expect(locale.t('hello')).toBe('Bonjour');
  });
});

