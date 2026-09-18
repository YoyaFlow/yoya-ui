import { describe, expect, it, vi } from 'vitest';
import { div, ref, span, tr, vText } from '../index.js';

/**
 * 首次提交的单趟化契约（票 25）：
 * 1. 每个后代在首次 commit 时只渲染一次——原先是 `_applySnapshotToElement()` 遍历一遍、
 *    `renderDom()` 再遍历一遍，整棵树被渲染两次（子节点的 `activateBindings` /
 *    `_commitChildren` / 权限与挂载条件判定都白跑一次）；
 * 2. 新鲜元素（类名属性必为空）提交时不读 `className` getter；
 * 3. 类名文本没有变化时不写 DOM（重复 `className()` / `toggleClass()`，也是 hydrate 的路径）；
 * 4. 行级结构的 DOM 调用次数锁成表（改动前：classReads 5，其余同）。
 */
function withDomCounters(run) {
  const counts = {
    createElement: 0,
    createTextNode: 0,
    setAttribute: 0,
    appendChild: 0,
    classReads: 0,
    classWrites: 0
  };
  const originals = {
    createElement: Document.prototype.createElement,
    createTextNode: Document.prototype.createTextNode,
    setAttribute: Element.prototype.setAttribute,
    appendChild: Node.prototype.appendChild,
    className: Object.getOwnPropertyDescriptor(Element.prototype, 'className')
  };
  const className = originals.className;

  Document.prototype.createElement = function (...args) {
    counts.createElement += 1;
    return originals.createElement.apply(this, args);
  };
  Document.prototype.createTextNode = function (...args) {
    counts.createTextNode += 1;
    return originals.createTextNode.apply(this, args);
  };
  Element.prototype.setAttribute = function (...args) {
    counts.setAttribute += 1;
    return originals.setAttribute.apply(this, args);
  };
  Node.prototype.appendChild = function (...args) {
    counts.appendChild += 1;
    return originals.appendChild.apply(this, args);
  };
  Object.defineProperty(Element.prototype, 'className', {
    configurable: true,
    get() {
      counts.classReads += 1;
      return className.get.call(this);
    },
    set(value) {
      counts.classWrites += 1;
      className.set.call(this, value);
    }
  });

  try {
    return { counts, result: run(counts) };
  } finally {
    Document.prototype.createElement = originals.createElement;
    Document.prototype.createTextNode = originals.createTextNode;
    Element.prototype.setAttribute = originals.setAttribute;
    Node.prototype.appendChild = originals.appendChild;
    Object.defineProperty(Element.prototype, 'className', className);
  }
}

/** 在回调期间统计类名写入次数（只包 className，其余 DOM 调用照旧）。 */
function withClassWriteCounter(run) {
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'className');
  const state = { writes: 0 };
  Object.defineProperty(Element.prototype, 'className', {
    configurable: true,
    get() {
      return descriptor.get.call(this);
    },
    set(value) {
      state.writes += 1;
      descriptor.set.call(this, value);
    }
  });

  try {
    return { state, result: run(state) };
  } finally {
    Object.defineProperty(Element.prototype, 'className', descriptor);
  }
}

/** 官方基准条目的一行结构（8 个元素 + 2 个文本节点）。 */
function rowLike(label) {
  return tr((line) => {
    line.attr('data-row-id', '1');
    line.td((cell) => cell.className('col-md-1').child('1'));
    line.td((cell) => {
      cell.className('col-md-4');
      cell.a((link) => link.child(vText(label)));
    });
    line.td((cell) => {
      cell.className('col-md-1');
      cell.a((link) => {
        link.span((icon) => icon.className('icon').attr('aria-hidden', 'true'));
      });
    });
    line.td((cell) => cell.className('col-md-6'));
  });
}

describe('ElementNode first commit', () => {
  it('renders every descendant exactly once on the first commit', () => {
    const leaf = span('leaf');
    const middle = div((node) => node.child(leaf));
    const root = div((node) => node.child(middle));
    const leafSpy = vi.spyOn(leaf, 'renderDom');
    const middleSpy = vi.spyOn(middle, 'renderDom');

    const element = root.renderDom();

    expect(middleSpy).toHaveBeenCalledTimes(1);
    expect(leafSpy).toHaveBeenCalledTimes(1);
    expect(element.querySelector('span').textContent).toBe('leaf');
  });

  it('keeps deep structures in document order on the first commit', () => {
    const root = div((node) => {
      node.span('a');
      node.div((inner) => inner.span('b'));
      node.span('c');
    });

    expect(root.renderDom().textContent).toBe('abc');
  });

  it('does not read className while committing a fresh element', () => {
    const { counts, result } = withDomCounters(() =>
      div((node) => node.className('card').child('x')).renderDom()
    );

    expect(counts.classReads).toBe(0);
    expect(counts.classWrites).toBe(1);
    expect(result.className).toBe('card');
  });

  it('skips the class write when the text is unchanged', () => {
    const node = div();
    const element = node.renderDom();

    withClassWriteCounter((state) => {
      node.className('card');
      expect(state.writes).toBe(1);

      node.className('card');
      expect(state.writes).toBe(1);

      node.toggleClass('card', true);
      expect(state.writes).toBe(1);

      node.toggleClass('danger', true);
      expect(state.writes).toBe(2);
      expect(element.className).toBe('card danger');

      node.toggleClass('card', false);
      expect(state.writes).toBe(3);
      expect(element.className).toBe('danger');

      node.className();
      expect(state.writes).toBe(3);
    });

    expect(element.className).toBe('danger');
  });

  it('locks the DOM call table for a row-like structure', () => {
    const label = ref('label 1');
    const { counts } = withDomCounters(() => rowLike(label).renderDom());

    expect(counts).toEqual({
      createElement: 8,
      createTextNode: 2,
      setAttribute: 2,
      appendChild: 9,
      classReads: 0,
      classWrites: 5
    });
  });
});
