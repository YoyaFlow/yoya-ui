import { describe, expect, it } from 'vitest';
import { componentNameOf, hasComponentIdentity, vTransition } from '../index.js';
import { div } from '../html/index.js';

/** jsdom 没有 WAAPI：桩一层 `Element.animate`，好把 `motion: 'always'` 那条路走通。 */
const stubAnimate = () => {
  const calls = [];
  const original = window.HTMLElement.prototype.animate;
  window.HTMLElement.prototype.animate = function animate(keyframes, options) {
    const record = { keyframes, options, cancelled: false, onfinish: null };
    calls.push(record);
    return {
      cancel: () => {
        record.cancelled = true;
      },
      set onfinish(handler) {
        record.onfinish = handler;
      }
    };
  };
  return {
    calls,
    restore: () => {
      if (original === undefined) {
        delete window.HTMLElement.prototype.animate;
      } else {
        window.HTMLElement.prototype.animate = original;
      }
    }
  };
};

const mountInto = (node) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  node.bindTo(host);
  return host;
};

describe('vTransition', () => {
  it('renders a wrapper in enter state with children', () => {
    const transition = vTransition({ children: '内容' });
    const element = transition.renderDom();

    expect(hasComponentIdentity(transition, 'VTransition')).toBe(true);
    expect(element.getAttribute('vn')).toContain('VTransition');
    expect(element.dataset.state).toBe('enter');
    expect(element.dataset.state).toBe('enter');
    expect(element.dataset.motion).toBe('auto');
    expect(element.textContent).toContain('内容');
  });

  it('moves to leave state and hides after animation ends', () => {
    // 监听器在**落地**时挂（whenMount）：先把元素挂进容器，事件才有归属
    const host = document.createElement('div');
    document.body.appendChild(host);
    const transition = vTransition({ children: '内容' });
    transition.bindTo(host);
    const element = host.firstElementChild;

    transition.show(false);
    expect(element.dataset.state).toBe('leave');
    expect(element.dataset.state).toBe('leave');

    element.dispatchEvent(new Event('animationend'));
    expect(element.dataset.hidden).toBe('true');

    transition.show(true);
    expect(element.dataset.state).toBe('enter');
    expect(element.hasAttribute('data-hidden')).toBe(false);

    transition.destroy();
    host.remove();
  });

  it('exposes motion policy on the element', () => {
    const transition = vTransition({ motion: 'always' });
    expect(transition.renderDom().dataset.motion).toBe('always');
  });

  it('motion: always 走 WAAPI：挂载播 enter、切换播 leave、销毁取消', () => {
    const animate = stubAnimate();
    const transition = vTransition({ motion: 'always' }, '内容');
    const host = mountInto(transition);
    const element = host.firstElementChild;

    expect(animate.calls).toHaveLength(1);
    expect(animate.calls[0].options.duration).toBe(240);
    expect(animate.calls[0].keyframes[0].opacity).toBe(0); // enter 起始帧

    transition.duration(120);
    transition.show(false);
    expect(animate.calls).toHaveLength(2);
    expect(animate.calls[1].options.duration).toBe(120);
    expect(animate.calls[0].cancelled, '上一条动画要取消').toBe(true);

    animate.calls[1].onfinish(); // leave 动画结束 → 隐藏
    expect(element.dataset.hidden).toBe('true');

    transition.destroy();
    expect(animate.calls[1].cancelled, '销毁时取消在跑的动画').toBe(true);
    animate.restore();
    host.remove();
  });

  it('prefers-reduced-motion：动画由 CSS 关掉、退出立即隐藏', () => {
    const originalMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });

    const transition = vTransition('内容');
    const host = mountInto(transition);
    const element = host.firstElementChild;

    expect(element.dataset.state).toBe('enter');

    transition.show(false);
    expect(element.dataset.state).toBe('leave');
    expect(element.dataset.hidden).toBe('true');

    transition.show(true);
    expect(element.hasAttribute('data-hidden')).toBe(false);

    transition.destroy();
    host.remove();
    window.matchMedia = originalMedia;
  });

  it('调用方 setup 分派与旧工厂一致（对象 + 文本 + 节点 + 多余实参）', () => {
    const extra = div('尾部');
    const transition = vTransition({ motion: 'auto' }, '正文', extra, '第四个');
    const element = transition.renderDom();

    expect(element.textContent).toBe('正文尾部第四个');
    expect(transition.motion()).toBe('auto');
  });

  it('身份是对象事实且落到真 DOM：hasComponentIdentity 成立、DOM 带 vn', () => {
    const transition = vTransition('内容');

    expect(hasComponentIdentity(transition, 'VTransition')).toBe(true);
    expect(componentNameOf(transition)).toBe('VTransition');
    expect(transition.renderDom().getAttribute('vn')).toBe('VTransition');
    expect(transition.toHTML()).toContain('vn="VTransition"');
  });

  it('serializes deterministically for SSR', () => {
    const html = vTransition({ children: '内容' }).toHTML();

    expect(html).toContain('vn="VTransition"');
    expect(html).toContain('data-state="enter"');
  });
});
