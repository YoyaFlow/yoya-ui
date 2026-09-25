import { describe, expect, it } from 'vitest';
import * as apiEntry from '../api.js';
import { div, span } from '@yoyaflow/yoya-core';
import * as core from './index.js';

describe('API entry boundary', () => {
  it('exports communication contracts from the dedicated entry', () => {
    expect(typeof apiEntry.configureRequest).toBe('function');
    expect(apiEntry.RequestBase).toBeTypeOf('function');
    expect(apiEntry.Result).toBeTypeOf('function');
  });

  it('keeps communication contracts out of the core entry', () => {
    expect(core.configureRequest).toBeUndefined();
    expect(core.RequestBase).toBeUndefined();
    expect(core.Result).toBeUndefined();
  });

  /**
   * 第三方（或库外）形态 C 组件以前直接读写 `_children` / `_classes` / `_styles` / `_attrs`，
   * 这些字段已在 0.6.3 变成实现细节（空列表哨兵、类名文本、按需创建）。这五个 helper 是
   * 官方迁移路径，必须从公开入口可达、并且守住各自的语义。
   */
  it('exposes the node-internals helpers from the public entry', () => {
    for (const name of [
      'nodeChildren',
      'appendNodeChild',
      'elementStyles',
      'elementAttrs',
      'elementClassNames',
      'elementHasClass'
    ]) {
      expect(typeof core[name], name).toBe('function');
    }

    expect(Object.isFrozen(core.EMPTY_CHILDREN)).toBe(true);
    expect(core.EMPTY_CHILDREN).toEqual([]);
  });

  it('keeps child lists, classes, attrs and styles usable through the helpers', () => {
    const box = div();

    // 空列表是共享哨兵：helper 第一次写入时换成真数组，原哨兵不受影响
    expect(box._children).toBe(core.EMPTY_CHILDREN);
    const children = core.nodeChildren(box);
    expect(children).not.toBe(core.EMPTY_CHILDREN);
    expect(core.EMPTY_CHILDREN).toEqual([]);
    core.appendNodeChild(box, span('x'));
    box.child('y');
    expect(box.children()).toHaveLength(2);

    // 类名：真身是文本字段，helper 读的是它
    const item = span('mode');
    item.className('acme-badge is-on');
    expect(core.elementHasClass(item, 'acme-badge')).toBe(true);
    expect(core.elementHasClass(item, 'acme')).toBe(false);
    expect(core.elementClassNames(item)).toEqual(['acme-badge', 'is-on']);

    // 样式 / 属性快照按需创建，但读到的永远是可直接改写的对象
    expect(item._styles).toBeUndefined();
    core.elementStyles(item).color = 'red';
    expect(item._styles.color).toBe('red');
    expect(item._attrs).toBeUndefined();
    core.elementAttrs(item)['data-mode'] = 'dark';
    expect(item._attrs['data-mode']).toBe('dark');
  });
});
