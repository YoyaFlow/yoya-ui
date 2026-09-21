/**
 * 弃用提示（票 03 阶段 1）。
 *
 * 形态 B（返回 `{ render(), … }` 的对象组件）表达能力已被 vNode 完全覆盖：命令、钩子、状态、
 * 边界一样不少，而它多出两个问题——对象是**一次性**的（同一对象挂两处会互相覆盖状态），
 * 以及编译器里要维护另一条形状分支。所以它退场：新写一律 vNode（有行为）或直接返回 ViewNode（无行为）。
 *
 * 只在 devtools 开启时报（与 hydrate 错位、区域构建期读取同一条口径），并按对象去重，不刷屏。
 */
import { isDevtoolsEnabled } from './devtools.js';

const warned = new WeakSet();

export function warnDeprecatedComponentObject(value, where) {
  if (!isDevtoolsEnabled() || !value || typeof value !== 'object') {
    return;
  }
  if (typeof value.render !== 'function' || warned.has(value)) {
    return;
  }

  warned.add(value);
  if (typeof console !== 'undefined') {
    console.warn(
      `[yoya] ${where} received a shape B component (an object with render()). Shape B is deprecated and ` +
        'single-use: write it as vNode((api) => view) when it has behaviour, or return a ViewNode directly.'
    );
  }
}
