import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitch, createI18n, div, vCard, vLanguageSwitch } from '../index.js';

describe('vLanguageSwitch', () => {
  it('renders a language dropdown and switches the locale', () => {
    const locale = createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': { greeting: '你好' },
        en: { greeting: 'Hello' }
      }
    });
    const component = vLanguageSwitch({
      locale,
      languages: [
        { label: '中文', value: 'zh-CN' },
        { label: 'English', value: 'en' }
      ]
    });
    const element = component.render().renderDom();
    const trigger = element.querySelector('.yoya-vdropdown-trigger');
    const englishItem = element.querySelector('.yoya-vmenu-item[data-language="en"]');

    expect(element.classList.contains('yoya-vlanguage-switch')).toBe(true);
    expect(element.querySelectorAll('.yoya-vmenu-item')).toHaveLength(2);
    expect(trigger.textContent).toContain('中文');

    trigger.click();

    expect(element.querySelector('.yoya-vdropdown-panel').getAttribute('aria-hidden')).toBe(
      'false'
    );

    englishItem.click();

    expect(locale.getLanguage()).toBe('en');
    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('.yoya-vmenu-item[data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
  });

  it('works as a parent shortcut and accepts a setup callback', () => {
    const locale = createI18n({ language: 'zh-CN' });
    const page = div((root) => {
      root.vLanguageSwitch((control) => control.locale(locale).size('small'));
    });
    const element = page.renderDom();
    const switchElement = element.querySelector('.yoya-vlanguage-switch');

    expect(switchElement).not.toBeNull();
    expect(switchElement.dataset.size).toBe('small');
  });

  it('stays in sync when the locale changes externally', () => {
    const locale = createI18n({ language: 'zh-CN' });
    const component = vLanguageSwitch({
      locale,
      languages: [
        { label: '中文', value: 'zh-CN' },
        { label: 'English', value: 'en' }
      ]
    });
    const element = component.render().renderDom();
    const trigger = element.querySelector('.yoya-vdropdown-trigger');

    locale.setLanguage('en');

    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('.yoya-vmenu-item[data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
    expect(
      element.querySelector('.yoya-vmenu-item[data-language="zh-CN"]').getAttribute('aria-current')
    ).toBeNull();
  });

  it('supports the object component pattern, onChange, attrs, and style', () => {
    const locale = createI18n({ language: 'zh-CN' });
    const onChange = vi.fn();
    const component = LanguageSwitch({
      attrs: { 'data-demo-switch': 'true' },
      languages: [
        ['zh-CN', '中文'],
        ['en', 'English']
      ],
      locale,
      onChange,
      style: { maxWidth: '180px' }
    });
    const element = component.render().renderDom();
    const englishItem = element.querySelector('.yoya-vmenu-item[data-language="en"]');

    expect(englishItem.textContent).toBe('English');
    expect(element.dataset.demoSwitch).toBe('true');
    expect(element.style.maxWidth).toBe('180px');

    englishItem.click();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ value: 'en' }), locale);
  });

  it('renders inside compound components through a parent shortcut', () => {
    const locale = createI18n({ language: 'zh-CN' });
    const component = vLanguageSwitch({ locale });
    const card = vCard((content) => {
      content.vCardFooter((footer) => {
        footer.child(component);
      });
    });
    const element = card.renderDom();
    const trigger = element.querySelector('.yoya-vdropdown-trigger');

    expect(element.querySelectorAll('.yoya-vlanguage-switch')).toHaveLength(1);
    expect(element.querySelectorAll('.yoya-vmenu-item')).toHaveLength(2);
    expect(component.languages().map((item) => item.value)).toEqual(['zh-CN', 'en']);

    element.querySelector('.yoya-vmenu-item[data-language="en"]').click();

    expect(locale.getLanguage()).toBe('en');
    expect(component.languages().map((item) => item.value)).toEqual(['zh-CN', 'en']);
    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('.yoya-vmenu-item[data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
  });
});
