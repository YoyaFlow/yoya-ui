/**
 * 票 42 / 槽模型第二档（C：普通元素 + 框架投影）。
 *
 * 目标语义：内容归**宿主组件**所有，槽位元素只是投影点 ——
 * 槽位元素（含它是区域的情况）重建时**不能**销毁用户内容。
 */
import { describe, expect, it } from 'vitest';
import { div, span, vNode } from '../index.js';

const mountToHost = (node) => {
  document.body.innerHTML = '';
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
};

const cardWithRegionSlot = () =>
  vNode(() =>
    div((root) => {
      root.span({ slot: 't-head' }, (head) => {
        head.rebuildable();
        head.span('default-head');
      });
      root.span('body');
    })
  );

describe('slot projection (content owned by the host)', () => {
  it('keeps projected content when the slot element rebuilds', () => {
    const card = cardWithRegionSlot();
    card.child(span({ slot: 't-head' }, 'user-head'));

    const host = mountToHost(card);
    expect(host.textContent).toContain('user-head');
    expect(host.textContent).not.toContain('default-head');

    const slotElement = card._slots.get('t-head');
    slotElement.rebuild();

    // 重建后槽位元素还是同一个，内容仍然在（不被销毁、顺序保持）
    expect(card._slots.get('t-head')).toBe(slotElement);
    expect(host.textContent).toContain('user-head');
    expect(host.textContent).toContain('body');
    expect(host.textContent).not.toContain('default-head');
  });

  it('keeps the one-carrier rule stable across rebuilds', () => {
    const card = cardWithRegionSlot();
    card.child(span({ slot: 't-head' }, 'first'));
    mountToHost(card);

    card._slots.get('t-head').rebuild();

    expect(() => card.child(span({ slot: 't-head' }, 'second'))).toThrow(/already received/);
  });

  it('keeps projected content when an ancestor region rebuilds', () => {
    const card = vNode(() =>
      div((root) => {
        root.div((wrapper) => {
          wrapper.rebuildable();
          wrapper.span({ slot: 't-head' }, 'default-head');
        });
        root.span('body');
      })
    );
    card.child(span({ slot: 't-head' }, 'user-head'));

    const host = mountToHost(card);
    expect(host.textContent).toContain('user-head');

    const wrapper = card._resolved.children()[0];
    wrapper.rebuild();

    expect(host.textContent).toContain('user-head');
    expect(host.textContent).not.toContain('default-head');
    expect(host.textContent).toContain('body');
  });

  it('destroys projected content together with the host component', () => {
    const card = cardWithRegionSlot();
    const carrier = span({ slot: 't-head' }, 'user-head');
    card.child(carrier);
    mountToHost(card);

    card.destroy();

    expect(carrier._deleted).toBe(true);
  });
});
