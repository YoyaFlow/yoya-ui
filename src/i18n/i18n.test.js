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
    const element = component.renderDom();
    const trigger = element.querySelector('[vn~="VDropdownTrigger"]');
    const englishItem = element.querySelector('[vn~="VMenuItem"][data-language="en"]');

    expect(element.getAttribute('vn')).toContain('VLanguageSwitch');
    expect(element.querySelectorAll('[vn~="VMenuItem"]')).toHaveLength(2);
    expect(trigger.textContent).toContain('中文');

    trigger.click();

    expect(element.querySelector('[vn~="VDropdownPanel"]').getAttribute('aria-hidden')).toBe(
      'false'
    );

    englishItem.click();

    expect(locale.getLanguage()).toBe('en');
    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('[vn~="VMenuItem"][data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
  });

  it('works as a parent shortcut and accepts a setup callback', () => {
    const locale = createI18n({ language: 'zh-CN' });
    const page = div((root) => {
      root.vLanguageSwitch((control) => control.locale(locale).size('small'));
    });
    const element = page.renderDom();
    const switchElement = element.querySelector('[vn~="VLanguageSwitch"]');

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
    const element = component.renderDom();
    const trigger = element.querySelector('[vn~="VDropdownTrigger"]');

    locale.setLanguage('en');

    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('[vn~="VMenuItem"][data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
    expect(
      element.querySelector('[vn~="VMenuItem"][data-language="zh-CN"]').getAttribute('aria-current')
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
    const element = component.renderDom();
    const englishItem = element.querySelector('[vn~="VMenuItem"][data-language="en"]');

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
    const trigger = element.querySelector('[vn~="VDropdownTrigger"]');

    expect(element.querySelectorAll('[vn~="VLanguageSwitch"]')).toHaveLength(1);
    expect(element.querySelectorAll('[vn~="VMenuItem"]')).toHaveLength(2);
    expect(component.languages().map((item) => item.value)).toEqual(['zh-CN', 'en']);

    element.querySelector('[vn~="VMenuItem"][data-language="en"]').click();

    expect(locale.getLanguage()).toBe('en');
    expect(component.languages().map((item) => item.value)).toEqual(['zh-CN', 'en']);
    expect(trigger.textContent).toContain('English');
    expect(
      element.querySelector('[vn~="VMenuItem"][data-language="en"]').getAttribute('aria-current')
    ).toBe('page');
  });
});
