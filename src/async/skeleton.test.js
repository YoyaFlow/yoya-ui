import { describe, expect, it } from 'vitest';
import { VSkeleton, vSkeleton } from '../index.js';

describe('vSkeleton', () => {
  it('renders paragraph placeholder rows by default', () => {
    const skeleton = vSkeleton();
    const element = skeleton.renderDom();

    expect(skeleton).toBeInstanceOf(VSkeleton);
    expect(element.classList.contains('yoya-vskeleton')).toBe(true);
    expect(element.querySelectorAll('.yoya-vskeleton-bar')).toHaveLength(3);
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.dataset.variant).toBe('paragraph');
  });

  it('supports avatar and block variants', () => {
    const avatarElement = vSkeleton({ variant: 'avatar' }).renderDom();
    expect(avatarElement.querySelector('.yoya-vskeleton-avatar')).not.toBeNull();

    const blockElement = vSkeleton({ variant: 'block' }).renderDom();
    expect(blockElement.querySelector('.yoya-vskeleton-block')).not.toBeNull();
  });

  it('configures rows, avatar size and motion policy', () => {
    const skeleton = vSkeleton({ rows: 5, motion: 'always' });
    const element = skeleton.renderDom();

    expect(element.querySelectorAll('.yoya-vskeleton-bar')).toHaveLength(5);
    expect(element.dataset.motion).toBe('always');

    const avatarElement = vSkeleton({ variant: 'avatar', avatarSize: 64 }).renderDom();
    expect(avatarElement.querySelector('.yoya-vskeleton-avatar').style.width).toBe('64px');
  });

  it('configures text-like bar height for paragraph rows', () => {
    const skeleton = vSkeleton({ barHeight: 24 });
    const element = skeleton.renderDom();
    const bars = element.querySelectorAll('.yoya-vskeleton-bar');

    expect(bars).toHaveLength(3);
    bars.forEach((bar) => expect(bar.style.height).toBe('24px'));
  });

  it('configures the row gap between text lines', () => {
    const skeleton = vSkeleton({ gap: 4 });
    const element = skeleton.renderDom();

    expect(element.style.gap).toBe('4px');
  });

  it('shows real children when active is false', () => {
    const skeleton = vSkeleton({ active: false, children: '内容已加载' });
    const element = skeleton.renderDom();

    expect(element.textContent).toContain('内容已加载');
    expect(element.querySelectorAll('.yoya-vskeleton-bar')).toHaveLength(0);
    expect(element.dataset.active).toBe('false');
  });

  it('serializes deterministically for SSR', () => {
    const html = vSkeleton({ rows: 2 }).toHTML();

    expect(html).toContain('yoya-vskeleton');
    expect(html).toContain('yoya-vskeleton-bar');
  });
});
