import { afterEach, describe, expect, it } from 'vitest';
import { div, VThemeModeSwitch, vThemeModeSwitch } from '../index.js';

afterEach(() => {
  delete document.documentElement.dataset.yoyaMode;
  localStorage.clear();
});

describe('VThemeModeSwitch', () => {
  it('renders a mode switch with light, dark and system buttons', () => {
    const element = vThemeModeSwitch().renderDom();

    expect(element.querySelector("[data-theme-mode='light']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='dark']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='system']")).toBeTruthy();
  });

  it('switches the document mode and persists it by default', () => {
    const element = vThemeModeSwitch().renderDom();

    element.querySelector("[data-theme-mode='dark']").click();

    expect(document.documentElement.dataset.yoyaMode).toBe('dark');
    expect(localStorage.getItem('yoya-theme-mode')).toBe('dark');
  });

  it('highlights the active mode button', () => {
    const element = vThemeModeSwitch().renderDom();

    expect(element.querySelector("[data-theme-mode='light']").getAttribute('data-active')).toBe(
      'true'
    );

    element.querySelector("[data-theme-mode='system']").click();

    expect(element.querySelector("[data-theme-mode='system']").getAttribute('data-active')).toBe(
      'true'
    );
    expect(
      element.querySelector("[data-theme-mode='light']").getAttribute('data-active')
    ).toBeNull();
  });

  it('skips persistence when persist is disabled', () => {
    const element = vThemeModeSwitch({ persist: false }).renderDom();

    element.querySelector("[data-theme-mode='dark']").click();

    expect(document.documentElement.dataset.yoyaMode).toBe('dark');
    expect(localStorage.getItem('yoya-theme-mode')).toBeNull();
  });

  it('renders only the configured modes subset', () => {
    const element = vThemeModeSwitch({ modes: ['light', 'dark'] }).renderDom();

    expect(element.querySelector("[data-theme-mode='light']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='dark']")).toBeTruthy();
    expect(element.querySelector("[data-theme-mode='system']")).toBeNull();
  });

  it('supports the parent shortcut and class identity', () => {
    const root = div((page) => page.vThemeModeSwitch());
    const child = root.children()[0];

    expect(child).toBeInstanceOf(VThemeModeSwitch);
    expect(root.renderDom().querySelector("[data-theme-mode='light']")).toBeTruthy();
  });
});
