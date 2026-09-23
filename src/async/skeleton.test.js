import { describe, expect, it } from 'vitest';
import { hasComponentIdentity, vSkeleton } from '../index.js';

describe('vSkeleton', () => {
  it('renders paragraph placeholder rows by default', () => {
    const skeleton = vSkeleton();
    const element = skeleton.renderDom();

    expect(hasComponentIdentity(skeleton, 'VSkeleton')).toBe(true);
    expect(element.getAttribute('vn')).toContain('VSkeleton');
    expect(element.querySelectorAll('[vn~="VSkeletonBar"]')).toHaveLength(3);
    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.dataset.variant).toBe('paragraph');
  });

  it('supports avatar and block variants', () => {
    const avatarElement = vSkeleton({ variant: 'avatar' }).renderDom();
    expect(avatarElement.querySelector('[vn~="VSkeletonAvatar"]')).not.toBeNull();

    const blockElement = vSkeleton({ variant: 'block' }).renderDom();
    expect(blockElement.querySelector('[vn~="VSkeletonBlock"]')).not.toBeNull();
  });

  it('configures rows, avatar size and motion policy', () => {
    const skeleton = vSkeleton({ rows: 5, motion: 'always' });
    const element = skeleton.renderDom();

    expect(element.querySelectorAll('[vn~="VSkeletonBar"]')).toHaveLength(5);
    expect(element.dataset.motion).toBe('always');

    const avatarElement = vSkeleton({ variant: 'avatar', avatarSize: 64 }).renderDom();
    expect(avatarElement.style.getPropertyValue('--yoya-skeleton-avatar-size')).toBe('64px');
  });

  it('configures text-like bar height for paragraph rows', () => {
    const skeleton = vSkeleton({ barHeight: 24 });
    const element = skeleton.renderDom();
    const bars = element.querySelectorAll('[vn~="VSkeletonBar"]');

    expect(bars).toHaveLength(3);
    expect(element.style.getPropertyValue('--yoya-skeleton-bar-height')).toBe('24px');
    expect(bars[0].style.getPropertyValue('--yoya-skeleton-bar-width')).toBe('100%');
    expect(bars[2].style.getPropertyValue('--yoya-skeleton-bar-width')).toBe('60%');
  });

  it('configures the row gap between text lines', () => {
    const skeleton = vSkeleton({ gap: 4 });
    const element = skeleton.renderDom();

    expect(element.style.getPropertyValue('--yoya-skeleton-gap')).toBe('4px');
  });

  it('shows real children when active is false', () => {
    const skeleton = vSkeleton({ active: false, children: '内容已加载' });
    const element = skeleton.renderDom();

    expect(element.textContent).toContain('内容已加载');
    expect(element.querySelectorAll('[vn~="VSkeletonBar"]')).toHaveLength(0);
    expect(element.dataset.active).toBe('false');
  });

  it('serializes deterministically for SSR', () => {
    const html = vSkeleton({ rows: 2 }).toHTML();

    expect(html).toContain('vn="VSkeleton"');
    expect(html).toContain('vn="VSkeletonBar"');
  });
});
