/**
 * 组件 props 分派：**自己的键走命令、其余键落视图根元素**（这里守一个踩过的坑）。
 *
 * 坑的形状：`api.setupObject` 里把剩余键喂回 `self.node().setup(elementConfig)`。`self.node()`
 * 是**组件节点**，而组件节点的 `setupObject` 已被 `api.setupObject` 覆盖（`v-node.js` 的
 * `attachCommands` 把 api 上的同名方法挂成节点自有属性）——于是 `setup()` → `api.setupObject`
 * → 再 `setup()` → …… 栈溢出（实测 `RangeError: Maximum call stack size exceeded`）。
 * 正确落点是**视图根元素**（不跑组件壳时元素 options 的落点），所以定义里要留一份视图根引用。
 *
 * 覆盖 10 个曾写错的位置：VTable / VCarousel / VAnchor / VAnchorItem / VSteps / VStep /
 * VTabs / VTab / VRouter / VLink。
 */
import { describe, expect, it } from 'vitest';
import {
  vAnchor,
  vAnchorItem,
  vCarousel,
  vLink,
  vRouter,
  vStep,
  vSteps,
  vTab,
  vTabs,
  vTable
} from '../index.js';

/** 非命令键：`attrs` / `style` 是元素 options，不该被组件自己的 props 吃掉。 */
const elementOptions = (key) => ({
  attrs: { 'data-probe': key },
  style: { maxWidth: '200px' }
});

const CASES = [
  {
    name: 'VTable',
    key: 'vtable',
    build: (options) => vTable({ caption: '季度报表', ...options }),
    check: (element) =>
      expect(element.querySelector('[vn~="VTableCaption"]').textContent).toBe('季度报表')
  },
  {
    name: 'VCarousel',
    key: 'vcarousel',
    build: (options) => vCarousel({ slides: ['甲', '乙'], ...options }),
    check: (element) => expect(element.querySelectorAll('[vn~="VCarouselSlide"]')).toHaveLength(2)
  },
  {
    name: 'VAnchor',
    key: 'vanchor',
    build: (options) => vAnchor({ items: [{ href: '#a', title: '甲' }], ...options }),
    check: (element) =>
      expect(element.querySelectorAll('[vn~="VAnchorItem"]').length).toBeGreaterThan(0)
  },
  {
    name: 'VAnchorItem',
    key: 'vanchoritem',
    build: (options) => vAnchorItem({ title: '甲', ...options }),
    check: (element) => expect(element.textContent).toBe('甲')
  },
  {
    name: 'VSteps',
    key: 'vsteps',
    build: (options) => vSteps({ items: ['甲', '乙'], ...options }),
    check: (element) => expect(element.querySelectorAll('[vn~="VStep"]')).toHaveLength(2)
  },
  {
    name: 'VStep',
    key: 'vstep',
    build: (options) => vStep({ title: '甲', ...options }),
    check: (element) => expect(element.textContent).toContain('甲')
  },
  {
    name: 'VTabs',
    key: 'vtabs',
    build: (options) => vTabs({ items: [{ label: '甲' }], ...options }),
    check: (element) =>
      expect(element.querySelectorAll('[vn~="VTabTrigger"]').length).toBeGreaterThan(0)
  },
  {
    name: 'VTab',
    key: 'vtab',
    build: (options) => vTab({ label: '甲', ...options }),
    check: (element) => expect(element.textContent).toBe('甲')
  },
  {
    name: 'VRouter',
    key: 'vrouter',
    build: (options) => vRouter({ routes: [], ...options }),
    check: (element) => expect(element.getAttribute('data-yoya-router')).toBe('')
  },
  {
    name: 'VLink',
    key: 'vlink',
    build: (options) => {
      const appRouter = vRouter({ routes: [] });
      return vLink(appRouter, { label: '首页', to: '/home', ...options });
    },
    check: (element) => {
      expect(element.tagName.toLowerCase()).toBe('a');
      expect(element.getAttribute('href')).toContain('/home');
      expect(element.textContent).toBe('首页');
    }
  }
];

describe('组件 props 分派（元素选项落视图根）', () => {
  CASES.forEach(({ name, key, build, check }) => {
    it(`${name}：attrs / style 落视图根，自己的 props 照旧`, () => {
      const node = build(elementOptions(key));
      const element = node.renderDom();

      expect(element.getAttribute('data-probe')).toBe(key);
      expect(element.style.maxWidth).toBe('200px');
      check(element);

      node.destroy();
    });
  });
});
