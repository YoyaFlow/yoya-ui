import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, hasComponentIdentity, vGlowButton, viewRootOf } from '../index.js';

describe('vGlowButton', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a button with the vButton and glow class hooks', () => {
    const button = vGlowButton('立即部署');
    const element = button.renderDom();

    // 包装型：视图根是内层 `vButton` 组件，元素机制在它的视图根上（见 16 号第 31 条）
    expect(hasComponentIdentity(viewRootOf(button), 'VButton')).toBe(true);
    // 多值身份：流光按钮同时**是** VButton（旧类继承的语义）
    expect(hasComponentIdentity(button, 'VGlowButton')).toBe(true);
    expect(hasComponentIdentity(button, 'VButton')).toBe(true);
    expect(element.tagName).toBe('BUTTON');
    expect(element.getAttribute('vn')).toContain('VGlowButton');
    expect(element.getAttribute('vn')).toContain('VButton');
    expect(element.querySelector('[vn~="VButtonLabel"]').textContent).toBe('立即部署');
  });

  it('defaults to auto loop, auto motion, normal speed, ltr direction, strong strength and ripple on', () => {
    const element = vGlowButton('部署').renderDom();

    expect(element.dataset.glowMotion).toBe('auto');
    expect(element.dataset.glowPlay).toBe('auto');
    expect(element.dataset.glowSpeed).toBe('normal');
    expect(element.dataset.glowDirection).toBe('ltr');
    expect(element.dataset.glowStrength).toBe('strong');
    expect(element.dataset.glowRipple).toBe('on');
  });

  it('configures glow options and keeps inherited button states', () => {
    const button = vGlowButton('部署').glow({
      direction: 'rtl',
      motion: 'always',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    button.variant('danger').size('small').disabled(true);

    const element = button.renderDom();

    expect(button.glow()).toEqual({
      direction: 'rtl',
      motion: 'always',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    expect(element.dataset.glowMotion).toBe('always');
    expect(element.dataset.variant).toBe('danger');
    expect(element.dataset.size).toBe('small');
    expect(element.getAttribute('disabled')).not.toBeNull();
  });

  it('falls back to auto motion on invalid motion values', () => {
    const button = vGlowButton('部署').motion('invalid');
    const element = button.renderDom();

    expect(button.motion()).toBe('auto');
    expect(element.dataset.glowMotion).toBe('auto');
  });

  it('supports object creation with glow options and click handlers', () => {
    const click = vi.fn();
    const button = vGlowButton({
      label: '发布',
      play: 'off',
      speed: 'slow'
    });
    button.on('click', click);

    const element = button.renderDom();
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.dataset.glowPlay).toBe('off');
    expect(element.dataset.glowSpeed).toBe('slow');
    expect(element.dataset.glowDirection).toBe('ltr');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('spawns a click ripple inside the button and removes it after the animation', () => {
    const button = vGlowButton('部署');
    const element = button.renderDom();

    // 几何来自**事件当前的元素**（不是 `renderDom()` 再取一次）：先给它一份可测的 rect
    element.getBoundingClientRect = () => ({ height: 40, left: 10, top: 20, width: 200 });
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 60, clientY: 40 }));

    const ripple = element.querySelector('[vn~="VGlowButtonRipple"]');
    expect(ripple).not.toBeNull();
    expect(ripple.getAttribute('aria-hidden')).toBe('true');
    // size = max(200, 40) = 200；left = 60 - 10 - 100、top = 40 - 20 - 100
    expect(ripple.style.width).toBe('200px');
    expect(ripple.style.height).toBe('200px');
    expect(ripple.style.left).toBe('-50px');
    expect(ripple.style.top).toBe('-80px');

    ripple.dispatchEvent(new Event('animationend'));
    expect(element.querySelector('[vn~="VGlowButtonRipple"]')).toBeNull();
  });

  it('skips the click ripple when ripple is off', () => {
    const button = vGlowButton('部署').glow({ ripple: 'off' });
    const element = button.renderDom();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.querySelector('[vn~="VGlowButtonRipple"]')).toBeNull();
  });

  it('skips the click ripple when the inherited disabled state is on', () => {
    const button = vGlowButton('部署');
    const element = button.renderDom();

    button.disabled(true);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.querySelector('[vn~="VGlowButtonRipple"]')).toBeNull();

    button.disabled(false);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.querySelector('[vn~="VGlowButtonRipple"]')).not.toBeNull();
  });

  it('registers vGlowButton as a child shortcut on containers', () => {
    const root = div((body) => {
      body.vGlowButton('快捷创建');
    });
    const element = root.renderDom();

    expect(element.querySelector('[vn~="VGlowButton"] [vn~="VButtonLabel"]').textContent).toBe(
      '快捷创建'
    );
  });
});
