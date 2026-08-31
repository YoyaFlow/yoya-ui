import { afterEach, describe, expect, it } from 'vitest';
import { renderThemeDemo } from './theme-demo.js';

afterEach(() => {
  document.body.innerHTML = '';
  delete document.documentElement.dataset.yoyaMode;
  delete document.documentElement.dataset.yoyaDensity;
  document.documentElement.style.removeProperty('--yoya-raw-primary');
  localStorage.clear();
});

describe('theme playground demo', () => {
  it('renders mode, density and accent controls', () => {
    const element = renderThemeDemo().render().renderDom();

    expect(element.querySelector("[data-theme-mode='light']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='dark']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='system']")).toBeTruthy();
    expect(element.querySelector('[data-theme-density]')).toBeTruthy();
    expect(element.querySelector('[data-theme-accent]')).toBeTruthy();
  });

  it('switches the document mode from the demo buttons', () => {
    const element = renderThemeDemo().render().renderDom();

    element.querySelector("[data-theme-mode='dark']").click();

    expect(document.documentElement.dataset.yoyaMode).toBe('dark');

    element.querySelector("[data-theme-mode='system']").click();

    expect(document.documentElement.dataset.yoyaMode).toBe('system');
  });

  it('toggles compact density on the document root', () => {
    const element = renderThemeDemo().render().renderDom();
    const toggle = element.querySelector('[data-theme-density]');

    toggle.click();
    expect(document.documentElement.dataset.yoyaDensity).toBe('compact');

    toggle.click();
    expect(document.documentElement.dataset.yoyaDensity).toBeUndefined();
  });

  it('applies a raw accent color override through the color picker', () => {
    const element = renderThemeDemo().render().renderDom();
    const picker = element.querySelector('[data-theme-accent]');

    picker.querySelector('[data-vcolor-trigger]').click();
    picker.querySelector('[data-vcolor-palette] [data-vcolor-swatch="#3b82f6"]').click();

    expect(document.documentElement.style.getPropertyValue('--yoya-raw-primary')).toBe('#3b82f6');
  });
});
