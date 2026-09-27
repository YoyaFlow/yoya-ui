/**
 * 票 42 / T3：槽位路由（标记驱动 + 就近作用域）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { div, p, span, vNode } from '@yoyaflow/yoya-core';

let warnSpy = null;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

const mountToHost = (node) => {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
};

/** 一个最小的容器组件：结构里声明一个 body 槽位（默认内容 = 它自己的孩子）。 */
const container = (extra = null) => {
  const card = vNode(() =>
    div((root) => {
      root.span('head');
      root.div({ slot: 'body', attrs: { 'data-slot': 'body' } }, (body) => body.span('default'));
      if (extra) {
        root.p(extra);
      }
    })
  );
  return card;
};

describe('slot routing', () => {
  it('routes marked content into the matching slot and drops the envelope', () => {
    const card = container();
    card.child(div({ slot: 'body' }, (box) => box.span('from-user')));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe(
      '<div><span>head</span><div data-slot="body" slot="body"><span>from-user</span></div></div>'
    );
  });

  it('merges the envelope attributes into the slot element', () => {
    const card = container();
    card.child(div({ slot: 'body', attrs: { 'data-x': '1' } }, 'user'));

    const host = mountToHost(card);

    expect(host.innerHTML).toContain('data-x="1"');
    expect(host.innerHTML).toContain('>user<');
  });

  it('keeps unmarked content going to the root (plain element behaviour)', () => {
    const card = container();
    card.child(p('root-content'));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe(
      '<div><span>head</span><div data-slot="body" slot="body"><span>default</span></div>' +
        '<p>root-content</p></div>'
    );
  });

  it('does not mount content whose slot is missing, and warns', () => {
    const card = container();
    card.child(div({ slot: 'nope' }, 'lost'));

    const host = mountToHost(card);

    expect(host.innerHTML).not.toContain('lost');
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0][0])).toContain('nope');
  });

  it('rejects a duplicate slot declaration in one component', () => {
    const card = vNode(() =>
      div((root) => {
        root.div({ slot: 'body' }, 'a');
        root.div({ slot: 'body' }, 'b');
      })
    );

    expect(() => mountToHost(card)).toThrow(/Duplicate slot "body"/);
  });

  it('rejects a second carrier for the same slot', () => {
    const card = container();
    mountToHost(card);
    card.child(div({ slot: 'body' }, 'first'));

    expect(() => card.child(div({ slot: 'body' }, 'second'))).toThrow(/already received content/);
  });

  it('scopes slot names to the direct parent component', () => {
    const inner = container('inner-structure');
    const outer = vNode(() =>
      div((root) => {
        root.div({ slot: 'body' }, 'outer-slot');
        root.child(inner);
      })
    );

    outer.child(div({ slot: 'body' }, 'for-outer'));
    inner.child(div({ slot: 'body' }, 'for-inner'));

    const host = mountToHost(outer);

    expect(host.innerHTML).toContain('for-outer');
    expect(host.innerHTML).toContain('for-inner');
    expect(host.innerHTML).not.toContain('outer-slot');
  });

  it('keeps two instances of the same component independent', () => {
    const first = container();
    const second = container();
    first.child(div({ slot: 'body' }, 'A'));
    second.child(div({ slot: 'body' }, 'B'));

    const host = mountToHost(div((root) => root.child(first, second)));

    expect(host.innerHTML).toContain('A');
    expect(host.innerHTML).toContain('B');
  });
});

/**
 * 部件（part）走**一对属性**：结构侧 `vn_slot` = 落点，内容侧 `to_slot` = 投递。
 * 两侧不共用属性，所以内容上的标记不会被误当成结构里的落点（反之亦然）。
 */
describe('part routing', () => {
  /** 结构侧只有一个具名落点 `body` 的容器组件。 */
  const panel = () => vNode(() => div((root) => root.span({ vn_slot: 'body' }, 'default')));

  it('routes content into the matching vn_slot landing point by to_slot alone', () => {
    const card = panel();
    card.child(span({ to_slot: 'body' }, 'from-user'));

    const host = mountToHost(card);

    // 落点保留自己的 `vn_slot`；part 作为子节点进落点，自己的 `to_slot` 摘掉（标记只是路由指令）
    expect(host.innerHTML).toBe('<div><span vn_slot="body"><span>from-user</span></span></div>');
  });

  it('does not treat the landing-point attribute as a delivery marker', () => {
    const card = panel();
    card.child(span({ vn_slot: 'body' }, 'not-a-part'));

    const host = mountToHost(card);

    // 内容只写落点属性 → 不是 part：按普通内容挂进组件根，落点的默认内容原样保留
    expect(host.innerHTML).toBe(
      '<div><span vn_slot="body">default</span><span vn_slot="body">not-a-part</span></div>'
    );
  });

  it('routes unmarked content into the anonymous landing point (vn_slot="")', () => {
    const card = vNode(() => div((root) => root.span({ vn_slot: '' })));
    card.child(p('anonymous'));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe('<div><span vn_slot=""><p>anonymous</p></span></div>');
  });

  it('keeps a part with no matching landing point as plain root content', () => {
    const card = panel();
    card.child(span({ to_slot: 'footer' }, 'orphan'));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe(
      '<div><span vn_slot="body">default</span><span to_slot="footer">orphan</span></div>'
    );
  });

  it('replaces the previous part content when the same landing point receives twice', () => {
    const card = panel();
    card.child(span({ to_slot: 'body' }, 'first'));
    card.child(span({ to_slot: 'body' }, 'second'));

    const host = mountToHost(card);

    expect(host.innerHTML).toBe('<div><span vn_slot="body"><span>second</span></span></div>');
  });
});
