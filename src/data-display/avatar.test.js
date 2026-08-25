import { describe, expect, it } from 'vitest';
import { VAvatar, div, vAvatar } from '../index.js';

describe('vAvatar', () => {
  it('renders text avatars with stable class and data hooks', () => {
    const avatar = vAvatar('A');
    const element = avatar.renderDom();

    expect(avatar).toBeInstanceOf(VAvatar);
    expect(element.classList.contains('yoya-vavatar')).toBe(true);
    expect(element.dataset.shape).toBe('circle');
    expect(element.dataset.size).toBe('medium');
    expect(element.querySelector('.yoya-vavatar-content').textContent).toBe('A');
    expect(element.getAttribute('aria-label')).toBe('A');
  });

  it('supports image, alt, size, shape, status, and custom color', () => {
    const avatar = vAvatar({
      alt: 'Alice',
      color: '#0f766e',
      shape: 'square',
      size: 'large',
      src: '/alice.png',
      status: 'online'
    });
    const element = avatar.renderDom();
    const image = element.querySelector('.yoya-vavatar-image');

    expect(element.dataset.image).toBe('true');
    expect(image.getAttribute('src')).toBe('/alice.png');
    expect(image.getAttribute('alt')).toBe('Alice');
    expect(element.dataset.shape).toBe('square');
    expect(element.dataset.size).toBe('large');
    expect(element.dataset.status).toBe('online');
    expect(element.style.background).toBe('rgb(15, 118, 110)');
    expect(element.style.color).toContain('var(--yoya-color-text-inverse');
    expect(element.querySelector('.yoya-vavatar-status')).not.toBeNull();
  });

  it('updates icon, size, shape, status, and text through public methods', () => {
    const avatar = vAvatar({ icon: '★' });
    const element = avatar.renderDom();

    expect(element.querySelector('.yoya-vavatar-content').textContent).toBe('★');

    avatar.size('xlarge').shape('square').status('busy').text('B');

    expect(element.dataset.size).toBe('xlarge');
    expect(element.dataset.shape).toBe('square');
    expect(element.dataset.status).toBe('busy');
    expect(element.querySelector('.yoya-vavatar-content').textContent).toBe('B');
  });

  it('registers vAvatar as a parent shortcut', () => {
    const page = div((root) => {
      root.vAvatar('C');
    });
    const avatar = page.children()[0];

    expect(avatar).toBeInstanceOf(VAvatar);
    expect(page.renderDom().querySelector('.yoya-vavatar-content').textContent).toBe('C');
  });

  it('supports shared element options and final callbacks', () => {
    let callbackNode = null;
    const avatar = vAvatar(null, { attrs: { id: 'avatar-demo' } }, (node) => {
      callbackNode = node;
      node.status('away');
    });
    const element = avatar.renderDom();

    expect(callbackNode).toBe(avatar);
    expect(element.id).toBe('avatar-demo');
    expect(element.dataset.status).toBe('away');
  });
});
