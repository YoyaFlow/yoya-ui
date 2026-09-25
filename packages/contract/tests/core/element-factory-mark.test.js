// 基础元素工厂标识（只有 html / svg 的基础元素快捷工厂带，组件不带）：
// 让"这个调用是不是基础元素工厂"由函数对象本身回答，编译器据此快速判断"当前块要不要编"。
import { describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import * as svg from '@yoyaflow/yoya-core/svg';
import { VBadge, vBadge } from '@yoyaflow/yoya-ui/internal/data-display/badge.js';
import { VTable, vTable } from '@yoyaflow/yoya-ui/internal/data-display/table.js';

const tableEntries = () => [...Object.entries(core.htmls), ...Object.entries(svg.svgs)];

describe('基础元素工厂标识', () => {
  it('html / svg 表里的每个基础工厂都带标记（标记值 = 规范标签名）', () => {
    const entries = tableEntries();
    expect(entries.length).toBeGreaterThan(150);

    const unmarked = entries.filter(([, factory]) => !core.isElementFactory(factory));
    expect(unmarked.map(([name]) => name)).toEqual([]);

    entries.forEach(([name, factory]) => {
      const tag = core.elementFactoryTagOf(factory);
      expect(typeof tag, name).toBe('string');
      // 别名共享同一个函数对象：拿到的仍是**规范标签**（与建出来的元素一致）
      expect(factory()._tagName, name).toBe(tag);
    });
  });

  it('组件不带标记（身份走 vn 属性契约 + 导出名）', () => {
    for (const definition of [VBadge, vBadge, VTable, vTable]) {
      expect(core.isElementFactory(definition)).toBe(false);
      expect(core.elementFactoryTagOf(definition)).toBe(null);
    }
  });

  it('标记是符号键 + 非枚举：不污染名字空间，也不进 for…in / spread', () => {
    const div = core.div;
    expect(Object.getOwnPropertyNames(div)).toEqual(['length', 'name', 'prototype']);
    expect(Object.getOwnPropertySymbols(div)).toEqual([core.ELEMENT_FACTORY_MARK]);
    expect({ ...div }).toEqual({});
    expect(core.ELEMENT_FACTORY_MARK).toBe(Symbol.for('@yoyaflow/yoya-ui/element-factory'));
  });

  it('第三方自建工厂可以 opt-in（markElementFactory）', () => {
    const myFactory = core.markElementFactory(function myFactory() {}, 'my-element');
    expect(core.isElementFactory(myFactory)).toBe(true);
    expect(core.elementFactoryTagOf(myFactory)).toBe('my-element');
    expect(core.isElementFactory(() => {})).toBe(false);
    expect(core.elementFactoryTagOf(null)).toBe(null);
  });
});
