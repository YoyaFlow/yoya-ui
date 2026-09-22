/**
 * options 对象里的**属性 / 样式通道**：
 *
 * - `attr({ … })` / `style({ … })` 里的**句柄（ref / computed）是活值绑定**，与逐条
 *   `attr(name, handle)` / `style(name, handle)` 走同一条管线（对象只是"一次写清"）；
 * - **自定义属性（`--x`）**必须走 `style.setProperty` 才能落进 DOM（`applyInlineStyle` 的分叉）；
 *   SSR 侧本来就等价：`serializeStyles` 的 kebab 转换不动 `--x` 这种键名。
 */
import { describe, expect, it } from 'vitest';
import { computed, ref, span } from '../index.js';
import { renderToString } from './ssr.js';

describe('options 对象里的句柄', () => {
  it('attr({…}) / style({…}) 里的 ref 是活值绑定', () => {
    const count = ref(3);
    const width = ref('10px');
    const node = span({
      attrs: { 'data-count': count, title: computed(() => `n=${count.value}`) },
      style: { width }
    });
    const element = node.renderDom();

    expect(element.getAttribute('data-count')).toBe('3');
    expect(element.getAttribute('title')).toBe('n=3');
    expect(element.style.width).toBe('10px');

    count.value = 7;
    width.value = '20px';

    expect(element.getAttribute('data-count')).toBe('7');
    expect(element.getAttribute('title')).toBe('n=7');
    expect(element.style.width).toBe('20px');
  });

  it('句柄写 null：属性摘掉、样式清空；SSR 与 DOM 用同一份快照', () => {
    const count = ref(3);
    const node = span({ attrs: { 'data-count': count }, style: { width: '10px' } });
    const element = node.renderDom();

    expect(node.toHTML()).toContain('data-count="3"');
    expect(renderToString(() => span({ attrs: { 'data-count': 3 } })).html).toContain(
      'data-count="3"'
    );

    count.value = null;

    expect(element.hasAttribute('data-count')).toBe(false);
  });
});

describe('行内样式的自定义属性', () => {
  it('options 里写 --x：DOM 与 toHTML 都带上', () => {
    const node = span({ style: { '--yoya-gap': '4px', width: '10px' } });
    const element = node.renderDom();

    expect(element.style.getPropertyValue('--yoya-gap')).toBe('4px');
    expect(element.style.width).toBe('10px');
    expect(node.toHTML()).toContain('--yoya-gap:4px');
    // SSR 走的是同一份快照（`serializeStyles` 的 kebab 转换不动 `--x`）
    expect(renderToString(() => span({ style: { '--yoya-gap': '4px' } })).html).toContain(
      '--yoya-gap:4px'
    );
  });

  it('style(name, 句柄)：自定义属性也走活值绑定', () => {
    const gap = ref('4px');
    const element = span({ style: { '--yoya-gap': gap } }).renderDom();

    gap.value = '8px';

    expect(element.style.getPropertyValue('--yoya-gap')).toBe('8px');
  });

  it('清空自定义属性：写 null 后不再有值', () => {
    const node = span().style('--yoya-gap', '4px');
    const element = node.renderDom();

    node.style('--yoya-gap', null);

    expect(element.style.getPropertyValue('--yoya-gap')).toBe('');
    expect(node.style('--yoya-gap')).toBeUndefined();
  });
});
