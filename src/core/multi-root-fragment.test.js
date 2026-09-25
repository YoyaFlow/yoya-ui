import { describe, expect, it } from 'vitest';
import { div, ref, span } from '../index.js';
import { vTbody, vTr } from '../data-display/table.js';

describe('multi-root fragments', () => {
  it('mounts multiple component roots as direct children without a wrapper', () => {
    // 形态 A 薄工厂（票 07）：多根 = 直接返回节点数组
    const Group = () => ['Ada', 'Bob'].map((name) => vTr((tr) => tr.vTd(name)));
    const element = vTbody().child(Group).renderDom();

    expect(element.children.length).toBe(2);
    expect(element.children[0].tagName).toBe('TR');
    expect(element.children[0].textContent).toBe('Ada');
    expect(element.children[1].textContent).toBe('Bob');
  });

  it('swaps a mounted multi-root fragment after a full rebuild', () => {
    const count = ref(0);
    const host = div((ele) => {
      ele.rebuildable();
      // 构建期直读信号：写入才会重建这块区域
      ele.attr('data-size', String(count.value));
      // 每次重建都新建组件：ComponentNode 缓存自己那份视图结果
      ele.child(() => (count.value === 0 ? [div('a'), div('b')] : [div('c'), div('d'), div('e')]));
    });
    const container = host.renderDom();
    const first = container.children[0];

    expect(container.children.length).toBe(2);
    expect(container.textContent).toBe('ab');

    count.value = 1;

    expect(container.children.length).toBe(3);
    expect(container.children[0]).not.toBe(first);
    expect(container.textContent).toBe('cde');
  });

  it('renders a plain component returning an array of roots', () => {
    const component = () => [span('a'), span('b')];
    const element = div().child(component).renderDom();

    expect(element.children.length).toBe(2);
    expect(element.children[0].tagName).toBe('SPAN');
    expect(element.textContent).toBe('ab');
  });

  it('serializes multi-root fragments inline for SSR', () => {
    const Group = () => [span('x'), span('y')];
    const html = div().child(Group).toHTML();

    expect(html).toContain('<span>x</span><span>y</span>');
  });
});
