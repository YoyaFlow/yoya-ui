import { describe, expect, it, vi } from 'vitest';
import { div, vTab, vTabs } from '../index.js';

describe('vTabs', () => {
  it('renders semantic tabs and exposes the active panel', () => {
    const tabs = vTabs({
      active: 'logs',
      ariaLabel: '服务导航',
      items: [
        { content: '服务概览', key: 'overview', label: '概览' },
        { content: (panel) => panel.p('运行日志'), key: 'logs', label: '日志' },
        { content: '禁用内容', disabled: true, key: 'disabled', label: '禁用' }
      ]
    });
    const element = tabs.renderDom();
    const triggers = element.querySelectorAll('.yoya-vtab-trigger');
    const panels = element.querySelectorAll('.yoya-vtab-panel');

    expect(element.dataset.activeIndex).toBe('1');
    expect(element.dataset.tabCount).toBe('3');
    expect(element.querySelector('.yoya-vtabs-nav').getAttribute('aria-label')).toBe('服务导航');
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
    expect(triggers[1].getAttribute('tabindex')).toBe('0');
    expect(triggers[0].getAttribute('aria-selected')).toBe('false');
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    expect(panels[1].textContent).toContain('运行日志');
    expect(triggers[2].disabled).toBe(true);
  });

  it('switches tabs on click, skips disabled tabs, and emits change', () => {
    const changeHandler = vi.fn();
    const tabs = vTabs({
      change: changeHandler,
      items: [
        { content: '概览内容', label: '概览' },
        { content: '配置内容', disabled: true, label: '配置' },
        { content: '日志内容', label: '日志' }
      ]
    });
    const element = tabs.renderDom();
    const triggers = element.querySelectorAll('.yoya-vtab-trigger');

    triggers[2].click();

    expect(tabs.active()).toBe(2);
    expect(triggers[2].getAttribute('aria-selected')).toBe('true');
    expect(changeHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        active: 2,
        index: 2,
        key: null
      })
    );

    triggers[1].click();

    expect(tabs.active()).toBe(2);
    expect(changeHandler).toHaveBeenCalledTimes(1);
  });

  it('moves focus and selection with keyboard arrows and Home/End', () => {
    const tabs = vTabs({
      items: [
        { content: '概览', label: '概览' },
        { content: '配置', disabled: true, label: '配置' },
        { content: '日志', label: '日志' }
      ]
    });
    const element = tabs.renderDom();
    document.body.appendChild(element);
    const triggers = element.querySelectorAll('.yoya-vtab-trigger');

    triggers[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));

    expect(tabs.active()).toBe(2);
    expect(triggers[2].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(triggers[2]);

    triggers[2].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));

    expect(tabs.active()).toBe(0);
    expect(document.activeElement).toBe(triggers[0]);

    triggers[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));

    expect(tabs.active()).toBe(2);
  });

  it('supports vertical orientation, variants, sizes, and dynamic items', () => {
    const tabs = vTabs({
      items: [{ label: 'A' }, { label: 'B' }],
      orientation: 'vertical',
      size: 'small',
      variant: 'pills'
    });
    const element = tabs.renderDom();

    expect(element.dataset.orientation).toBe('vertical');
    expect(element.dataset.variant).toBe('pills');
    expect(element.dataset.size).toBe('small');
    expect(element.querySelector('.yoya-vtabs-nav').getAttribute('aria-orientation')).toBe(
      'vertical'
    );

    tabs.items([
      { content: 'X', label: 'X' },
      { content: 'Y', label: 'Y' }
    ]);
    tabs.active(1);

    expect(tabs.children()).toHaveLength(2);
    expect(element.querySelectorAll('.yoya-vtab-trigger')[1].getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(element.textContent).toContain('Y');
  });

  it('supports declarative vTab children and parent shortcuts', () => {
    const root = div();
    root.vTabs((tabs) => {
      tabs.ariaLabel('演示标签');
      tabs.vTab((tab) => {
        tab.key('overview');
        tab.label('概览');
        tab.content('概览面板');
      });
      tabs.vTab({
        content: '配置面板',
        label: '配置'
      });
    });
    const element = root.renderDom();

    expect(element.querySelectorAll('.yoya-vtab-trigger')).toHaveLength(2);
    expect(element.querySelector('.yoya-vtabs-nav').getAttribute('aria-label')).toBe('演示标签');
    expect(element.querySelector('.yoya-vtab-panel').textContent).toContain('概览面板');
    expect(root.children()[0].active()).toBe('overview');
  });

  it('serializes tab structure to HTML', () => {
    const html = vTabs({
      items: [{ label: '概览', content: '概览内容' }]
    }).toHTML();

    expect(html).toContain('class="yoya-component yoya-vtabs"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('概览');
  });

  it('supports vTab as a standalone factory', () => {
    const tab = vTab({
      content: '内容',
      label: '标签'
    });

    expect(tab.label()).toBe('标签');
    expect(tab._panel.textContent()).toBe('内容');
  });
});
