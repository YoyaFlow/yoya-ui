import { afterEach, describe, expect, it, vi } from 'vitest';
import { HtmlElementNode, div, vGlowButton } from '../index.js';

describe('vGlowButton', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a button with the vButton and glow class hooks', () => {
    const button = vGlowButton('立即部署');
    const element = button.renderDom();

    expect(button).toBeInstanceOf(HtmlElementNode);
    expect(element.tagName).toBe('BUTTON');
    expect(element.classList.contains('yoya-vbutton')).toBe(true);
    expect(element.classList.contains('yoya-vglow-button')).toBe(true);
    expect(element.querySelector('.yoya-vbutton-label').textContent).toBe('立即部署');
  });

  it('defaults to auto loop, normal speed, ltr direction, strong strength and ripple on', () => {
    const element = vGlowButton('部署').renderDom();

    expect(element.dataset.glowPlay).toBe('auto');
    expect(element.dataset.glowSpeed).toBe('normal');
    expect(element.dataset.glowDirection).toBe('ltr');
    expect(element.dataset.glowStrength).toBe('strong');
    expect(element.dataset.glowRipple).toBe('on');
  });

  it('configures glow options and keeps inherited button states', () => {
    const button = vGlowButton('部署').glow({
      direction: 'rtl',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    button.variant('danger').size('small').disabled(true);

    const element = button.renderDom();

    expect(button.glow()).toEqual({
      direction: 'rtl',
      play: 'hover',
      ripple: 'off',
      speed: 'fast',
      strength: 'soft'
    });
    expect(element.dataset.variant).toBe('danger');
    expect(element.dataset.size).toBe('small');
    expect(element.getAttribute('disabled')).not.toBeNull();
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

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const ripple = element.querySelector('.yoya-vglow-button-ripple');
    expect(ripple).not.toBeNull();
    expect(ripple.getAttribute('aria-hidden')).toBe('true');

    ripple.dispatchEvent(new Event('animationend'));
    expect(element.querySelector('.yoya-vglow-button-ripple')).toBeNull();
  });

  it('skips the click ripple when ripple is off', () => {
    const button = vGlowButton('部署').glow({ ripple: 'off' });
    const element = button.renderDom();

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(element.querySelector('.yoya-vglow-button-ripple')).toBeNull();
  });

  it('registers vGlowButton as a child shortcut on containers', () => {
    const root = div((body) => {
      body.vGlowButton('快捷创建');
    });
    const element = root.renderDom();

    expect(element.querySelector('.yoya-vglow-button .yoya-vbutton-label').textContent).toBe(
      '快捷创建'
    );
  });
});
