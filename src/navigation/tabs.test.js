import { describe, expect, it, vi } from 'vitest';
import { div, ref, span, vTab, vTabs } from '../index.js';

const TRIGGER = "[vn~='VTabTrigger']";
const PANEL = "[vn~='VTabPanel']";

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
    const triggers = element.querySelectorAll("[vn~='VTabTrigger']");
    const panels = element.querySelectorAll("[vn~='VTabPanel']");

    expect(element.dataset.activeIndex).toBe('1');
    expect(element.dataset.tabCount).toBe('3');
    expect(element.querySelector("[vn~='VTabsNav']").getAttribute('aria-label')).toBe('服务导航');
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
    const triggers = element.querySelectorAll("[vn~='VTabTrigger']");

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
    const triggers = element.querySelectorAll("[vn~='VTabTrigger']");

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
    expect(element.querySelector("[vn~='VTabsNav']").getAttribute('aria-orientation')).toBe(
      'vertical'
    );

    tabs.items([
      { content: 'X', label: 'X' },
      { content: 'Y', label: 'Y' }
    ]);
    tabs.active(1);

    expect(tabs.children()).toHaveLength(2);
    expect(element.querySelectorAll("[vn~='VTabTrigger']")[1].getAttribute('aria-selected')).toBe(
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

    expect(element.querySelectorAll("[vn~='VTabTrigger']")).toHaveLength(2);
    expect(element.querySelector("[vn~='VTabsNav']").getAttribute('aria-label')).toBe('演示标签');
    expect(element.querySelector("[vn~='VTabPanel']").textContent).toContain('概览面板');
    expect(root.children()[0].active()).toBe('overview');
  });

  it('serializes tab structure to HTML', () => {
    const html = vTabs({
      items: [{ label: '概览', content: '概览内容' }]
    }).toHTML();

    expect(html).toContain('vn="VTabs"');
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
    expect(tab.panel().textContent()).toBe('内容');
  });

  it('keeps prop handles live and derives every trigger / panel from the selection', () => {
    const active = ref(0);
    const tabs = vTabs({
      active,
      items: [
        { content: 'A 面板', key: 'a', label: 'A' },
        { content: 'B 面板', key: 'b', label: 'B' }
      ]
    });
    const element = tabs.renderDom();
    const triggers = element.querySelectorAll(TRIGGER);
    const panels = element.querySelectorAll(PANEL);

    expect(element.dataset.activeKey).toBe('a');
    expect(triggers[0].getAttribute('aria-selected')).toBe('true');
    expect(panels[1].hidden).toBe(true);

    // 句柄 props 是活值：写状态就落 DOM（触发器与面板都跟着走）
    active.value = 'b';

    expect(tabs.active()).toBe('b');
    expect(tabs.activeIndex()).toBe(1);
    expect(element.dataset.activeKey).toBe('b');
    expect(triggers[0].getAttribute('aria-selected')).toBe('false');
    expect(triggers[1].getAttribute('tabindex')).toBe('0');
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);

    tabs.destroy();
  });

  it('reconciles triggers and panels by identity instead of rebuilding them', () => {
    const first = vTab({ content: 'A 面板', label: 'A' });
    const second = vTab({ content: 'B 面板', label: 'B' });
    const tabs = vTabs({ items: [first] });
    const element = tabs.renderDom();
    const firstTrigger = element.querySelector(TRIGGER);
    const firstPanel = element.querySelector(PANEL);

    first.label('A2');
    tabs.vTab(second);

    const items = tabs.items();

    // 留下来的项还挂在原来的节点与 DOM 上（触发器 / 面板两段各自复用）
    expect(items[0]).toBe(first);
    expect(items[1]).toBe(second);
    expect(element.querySelectorAll(TRIGGER)[0]).toBe(firstTrigger);
    expect(element.querySelectorAll(PANEL)[0]).toBe(firstPanel);
    expect(firstTrigger.querySelector("[vn~='VTabLabel']").textContent).toBe('A2');
    expect(element.dataset.tabCount).toBe('2');
    expect(firstPanel.textContent).toContain('A 面板');

    // 整批替换：同一个项实例复用（两段一起），离场的销毁
    tabs.items([first]);

    expect(tabs.items()).toHaveLength(1);
    expect(element.querySelector(TRIGGER)).toBe(firstTrigger);
    expect(element.querySelector(PANEL)).toBe(firstPanel);
    expect(element.dataset.tabCount).toBe('1');

    tabs.destroy();
  });

  it('takes node label / icon from props and rejects them in the content commands', () => {
    const tab = vTab({
      content: '面板',
      icon: span('★'),
      label: span('节点标签')
    });
    const element = tab.renderDom();

    expect(element.querySelector("[vn~='VTabLabel']").textContent).toBe('节点标签');
    expect(element.querySelector("[vn~='VTabIcon']").textContent).toBe('★');
    expect(() => tab.label(span('其它'))).toThrow(/props\.label/);
    expect(() => tab.icon(span('其它'))).toThrow(/props\.icon/);

    tab.destroy();
  });
});
