import { describe, expect, it } from 'vitest';
import { div, VSlot, vCard, vCardHeader, vNode, vSlot, vText } from '../index.js';
import { applySetupValue, componentNameOf } from '../core/node.js';

describe('vSlot（零布局占位）', () => {
  it('renders a contents-display placeholder with its own identity', () => {
    const element = vSlot({ name: 'header' }).renderDom();

    expect(element.tagName).toBe('SPAN');
    expect(element.style.display).toBe('contents');
    expect(element.getAttribute('vn_slot')).toBe('header');
    expect(element.classList.contains('yoya-vslot')).toBe(true);
    expect(componentNameOf(vSlot())).toBe('VSlot');
  });

  it('takes the placeholder name through the standard setup entries', () => {
    // 定义 / 快捷方法分开：VSlot() 只建结构，占位名由 vSlot 的 setup 分派落位
    expect(vSlot).not.toBe(VSlot);
    expect(VSlot().attr('vn_slot')).toBeUndefined();
    // 裸值 = 占位名：由 setupString 解释，和工厂首参同一条路
    const named = vSlot('footer');
    expect(named.attr('vn_slot')).toBe('footer');
    expect(vSlot(7).attr('vn_slot')).toBe('7');

    const viaSetup = vSlot();
    applySetupValue(viaSetup, 'header');
    expect(viaSetup.attr('vn_slot')).toBe('header');

    // 对象形式：`name` 收成占位名，其余键继续走 options 分派
    const styled = vSlot({ attrs: { 'data-test': 'x' }, name: 'body', style: { gap: '4px' } });
    expect(styled.attr('vn_slot')).toBe('body');
    expect(styled.attr('data-test')).toBe('x');
    expect(styled.renderDom().style.gap).toBe('4px');
  });

  it('does not join the public slot mechanism (no slot attribute)', () => {
    const placeholder = vSlot({ name: 'header' }).renderDom();

    expect(placeholder.getAttribute('slot')).toBeNull();
    expect(placeholder.getAttribute('vn_slot')).toBe('header');
    // 公开槽位名单里没有它：slot="x" 只认 slot 属性
    const host = div((root) => {
      root.child(vSlot({ name: 'header' }));
    });
    expect(host.renderDom().querySelector('[slot]')).toBeNull();
  });

  it('routes content into the matching placeholder by the vn_slot marker alone', () => {
    const host = vNode((api, self) => {
      api.body = (content) => self.node().child(content);
      return div((root) => root.child(vSlot({ name: 'body' })));
    });
    const element = host
      .body(
        div({ vn_slot: 'body' }, (part) => {
          part.child(vText('正文'));
        })
      )
      .renderDom();
    const placeholders = element.querySelectorAll('[vn_slot="body"]');

    // 落位由标记决定：占位进 DOM，part 自己不留标记（标记只是路由指令）
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0].tagName).toBe('SPAN');
    expect(placeholders[0].style.display).toBe('contents');
    expect(placeholders[0].textContent).toBe('正文');
    expect(element.querySelector('[vn="VSlot"] > div')).not.toBeNull();
  });

  it('works as a parent shortcut on containers', () => {
    const page = div((root) => {
      root.vSlot('body');
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

  it('lands a card part through plain child() as well (marker-only route)', () => {
    // part 命令只是语法糖：同一份带 vn_slot 标记的节点走 child() 一样落位
    const card = vCard((node) => node.child(vCardHeader('不走命令')));
    const element = card.renderDom();
    const placeholders = element.querySelectorAll('[vn_slot="header"]');

    expect(placeholders).toHaveLength(1);
    expect(placeholders[0].textContent).toBe('不走命令');
    // 公开槽位名单里仍然没有它
    expect(element.querySelector('[slot]')).toBeNull();
  });
});
