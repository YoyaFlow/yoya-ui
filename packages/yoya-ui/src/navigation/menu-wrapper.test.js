import { describe, expect, it, vi } from 'vitest';
import { vMenuWrapper } from '../index.js';

describe('vMenuWrapper（数据驱动的菜单外壳）', () => {
  it('renders items from data and keeps the active row in sync', () => {
    const onSelect = vi.fn();
    const menu = vMenuWrapper({
      active: 'download',
      items: [{ key: 'new', label: '新建' }, { icon: 'D', key: 'download', label: '下载' }, '退出'],
      onSelect
    });
    const element = menu.renderDom();
    const items = [...element.querySelectorAll('[vn~="VMenuItem"]')];

    expect(items).toHaveLength(3);
    expect(items[1].dataset.active).toBe('true');
    expect(items[1].querySelector('[vn~="VMenuItemIcon"]').textContent).toBe('D');
    expect(items[2].textContent).toContain('退出');

    items[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(menu.active()).toBe('new');
    expect(items[0].dataset.active).toBe('true');
    expect(items[1].dataset.active).toBeUndefined();
    expect(onSelect).toHaveBeenCalledWith('new', expect.objectContaining({ key: 'new' }), 0);
  });

  it('reconciles rows by data key when items change', () => {
    const menu = vMenuWrapper({
      items: [
        { key: 'a', label: '甲' },
        { key: 'b', label: '乙' }
      ]
    });
    const element = menu.renderDom();

    expect(
      [...element.querySelectorAll('[data-row-key]')].map((row) => row.dataset.rowKey)
    ).toEqual(['a', 'b']);

    menu.items([
      { key: 'b', label: '乙' },
      { key: 'a', label: '甲（改）' }
    ]);

    const rows = [...element.querySelectorAll('[data-row-key]')];
    expect(rows.map((row) => row.dataset.rowKey)).toEqual(['b', 'a']);
    expect(rows[1].textContent).toContain('甲（改）');
  });

  it('pushes orientation to the structural layer and reports it back', () => {
    const menu = vMenuWrapper({ items: ['甲'], orientation: 'horizontal' });
    const element = menu.renderDom();

    expect(element.dataset.orientation).toBe('horizontal');
    expect(menu.orientation()).toBe('horizontal');
  });
});
