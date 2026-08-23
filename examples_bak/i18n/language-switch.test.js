import { describe, expect, it } from 'vitest';
import { renderI18nLanguageSwitchExample } from './language-switch.js';

describe('examples/i18n language switch', () => {
  it('renders zh-CN text by default through I18nTextNode shortcuts', () => {
    document.body.innerHTML = '<main id="i18n-root"></main>';

    const root = renderI18nLanguageSwitchExample('#i18n-root');

    expect(root.tagName()).toBe('section');
    expect(document.querySelector('#i18n-language-switch h1').textContent).toBe('语言切换演示');
    expect(document.querySelector('#i18n-intro').textContent).toBe(
      '使用 I18nTextNode 和字符串快捷写法实现无感语言切换。'
    );
    expect(document.querySelector('#current-language').textContent).toBe('当前语言：中文');
    expect(document.querySelector('[data-language="zh-CN"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-language="en"]').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('#feature-list li').textContent).toBe('字符串默认文案：内容');
  });

  it('switches all visible text when language buttons are clicked', () => {
    document.body.innerHTML = '<main id="i18n-root"></main>';

    renderI18nLanguageSwitchExample('#i18n-root');

    document.querySelector('[data-language="en"]').click();

    expect(document.querySelector('#i18n-language-switch h1').textContent).toBe('Language Switch Demo');
    expect(document.querySelector('#i18n-intro').textContent).toBe(
      'Switch language without rebuilding the surrounding ViewNode tree.'
    );
    expect(document.querySelector('#current-language').textContent).toBe('Current language: English');
    expect(document.querySelector('[data-language="zh-CN"]').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelector('[data-language="en"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#feature-list li').textContent).toBe('String default text: Content');

    document.querySelector('[data-language="zh-CN"]').click();

    expect(document.querySelector('#i18n-language-switch h1').textContent).toBe('语言切换演示');
    expect(document.querySelector('#current-language').textContent).toBe('当前语言：中文');
    expect(document.querySelector('[data-language="zh-CN"]').getAttribute('aria-pressed')).toBe('true');
  });
});
