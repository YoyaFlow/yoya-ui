import { describe, expect, it } from 'vitest';
import { hasComponentIdentity, vLazyImage } from '../index.js';

describe('vLazyImage', () => {
  it('renders a lazy image with alt text and loading state', () => {
    const image = vLazyImage({ src: '/pic.png', alt: '示例图片' });
    const element = image.renderDom();
    const img = element.querySelector('img');

    expect(hasComponentIdentity(image, 'VLazyImage')).toBe(true);
    expect(element.getAttribute('vn')).toContain('VLazyImage');
    expect(img.getAttribute('src')).toBe('/pic.png');
    expect(img.getAttribute('alt')).toBe('示例图片');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(element.dataset.state).toBe('loading');
  });

  it('marks loaded and error states from image events', () => {
    const image = vLazyImage({ src: '/pic.png' });
    const element = image.renderDom();
    const img = element.querySelector('img');

    img.dispatchEvent(new Event('load'));
    expect(element.dataset.state).toBe('loaded');

    img.dispatchEvent(new Event('error'));
    expect(element.dataset.state).toBe('error');
  });

  it('retries loading after an error', () => {
    const image = vLazyImage({ src: '/pic.png' });
    const element = image.renderDom();
    const img = element.querySelector('img');

    img.dispatchEvent(new Event('error'));
    expect(element.dataset.state).toBe('error');

    image.retry();
    expect(element.dataset.state).toBe('loading');

    img.dispatchEvent(new Event('load'));
    expect(element.dataset.state).toBe('loaded');
  });

  it('serializes deterministically for SSR', () => {
    const html = vLazyImage({ src: '/pic.png', alt: '示例' }).toHTML();

    expect(html).toContain('vn="VLazyImage"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('/pic.png');
  });
});
