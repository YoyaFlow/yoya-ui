import { describe, expect, it } from 'vitest';
import { div, vCard, vSlot, vSlotInsert, vSlotOf, vText } from '../index.js';
import { componentNameOf } from '../core/node.js';

describe('vSlot（零布局占位）', () => {
  it('renders a contents-display placeholder with its own identity', () => {
    const element = vSlot({ name: 'header' }).renderDom();

    expect(element.tagName).toBe('SPAN');
    expect(element.style.display).toBe('contents');
    expect(element.getAttribute('vn_slot')).toBe('header');
    expect(element.classList.contains('yoya-vslot')).toBe(true);
    expect(componentNameOf(vSlot())).toBe('VSlot');
  });

  it('accepts a bare name and keeps normal element options working', () => {
    const named = vSlot('footer');
    expect(named.attr('vn_slot')).toBe('footer');

    const styled = vSlot({ attrs: { 'data-test': 'x' }, name: 'body', style: { gap: '4px' } });
    expect(styled.attr('vn_slot')).toBe('body');
    expect(styled.attr('data-test')).toBe('x');
    expect(styled.renderDom().style.gap).toBe('4px');
  });

  it('does not join the public slot mechanism (no slot attribute)', () => {
    const element = vSlot({ name: 'header' }).renderDom();

    expect(element.getAttribute('slot')).toBeNull();
    // 内容作为子节点插入：占位自身不生成盒子，part 照常渲染
    const host = div((root) => {
      root.child(vSlot({ name: 'header' }));
    });
    const hostElement = host.renderDom();

    expect(vSlotOf(host, 'header')).not.toBeNull();
    expect(vSlotInsert(host, 'header', vText('标题'))).not.toBeNull();
    expect(hostElement.textContent).toBe('标题');
    // 外部插入只认 vn_slot：公开槽位名单里没有它
    expect(hostElement.querySelector('[slot]')).toBeNull();
  });

  it('works as a parent shortcut on containers', () => {
    const page = div((root) => {
      root.vSlot({ name: 'body' });
    });
    const element = page.renderDom();

    expect(element.querySelector('[vn_slot="body"]')).not.toBeNull();
  });

  it('keeps card parts out of the public slot namespace', () => {
    const card = vCard((node) => {
      node.vCardHeader('由 part 投递');
    });
    const element = card.renderDom();

    expect(element.querySelector('[vn="VCardHeader"]').textContent).toBe('由 part 投递');
  });
});
