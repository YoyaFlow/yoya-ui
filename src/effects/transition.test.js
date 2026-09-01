import { describe, expect, it } from 'vitest';
import { VTransition, vTransition } from '../index.js';

describe('vTransition', () => {
  it('renders a wrapper in enter state with children', () => {
    const transition = vTransition({ children: '内容' });
    const element = transition.renderDom();

    expect(transition).toBeInstanceOf(VTransition);
    expect(element.classList.contains('yoya-vtransition')).toBe(true);
    expect(element.classList.contains('yoya-vtransition--enter')).toBe(true);
    expect(element.dataset.state).toBe('enter');
    expect(element.dataset.motion).toBe('auto');
    expect(element.textContent).toContain('内容');
  });

  it('moves to leave state and hides after animation ends', () => {
    const transition = vTransition({ children: '内容' });
    const element = transition.renderDom();

    transition.show(false);
    expect(element.dataset.state).toBe('leave');
    expect(element.classList.contains('yoya-vtransition--leave')).toBe(true);

    element.dispatchEvent(new Event('animationend'));
    expect(element.style.display).toBe('none');

    transition.show(true);
    expect(element.dataset.state).toBe('enter');
    expect(element.style.display).not.toBe('none');
  });

  it('exposes motion policy on the element', () => {
    const transition = vTransition({ motion: 'always' });
    expect(transition.renderDom().dataset.motion).toBe('always');
  });

  it('serializes deterministically for SSR', () => {
    const html = vTransition({ children: '内容' }).toHTML();

    expect(html).toContain('yoya-vtransition');
    expect(html).toContain('data-state="enter"');
  });
});
