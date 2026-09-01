import { afterEach, describe, expect, it } from 'vitest';
import { VImagePreview, vImagePreview } from '../index.js';

describe('vImagePreview', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a thumbnail trigger', () => {
    const preview = vImagePreview({ src: '/big.png', thumb: '/small.png', alt: '示例' });
    const element = preview.renderDom();

    expect(preview).toBeInstanceOf(VImagePreview);
    expect(element.classList.contains('yoya-vimagepreview')).toBe(true);
    expect(element.querySelector('img').getAttribute('src')).toBe('/small.png');
  });

  it('opens a lightbox with a lazy large image and closes it', () => {
    const preview = vImagePreview({ src: '/big.png', thumb: '/small.png' });
    document.body.appendChild(preview.renderDom());

    preview.open();
    const overlay = document.querySelector('.yoya-vimagepreview-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.querySelector('.yoya-vlazyimage')).not.toBeNull();
    expect(overlay.querySelector('img').getAttribute('src')).toBe('/big.png');

    preview.close();
    expect(document.querySelector('.yoya-vimagepreview-overlay')).toBeNull();
  });

  it('opens on thumbnail click', () => {
    const preview = vImagePreview({ src: '/big.png', thumb: '/small.png' });
    const element = preview.renderDom();
    document.body.appendChild(element);

    element.querySelector('img').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.yoya-vimagepreview-overlay')).not.toBeNull();
  });

  it('closes on Escape', () => {
    const preview = vImagePreview({ src: '/big.png' });
    document.body.appendChild(preview.renderDom());

    preview.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.yoya-vimagepreview-overlay')).toBeNull();
  });

  it('zooms the stage', () => {
    const preview = vImagePreview({ src: '/big.png' });
    document.body.appendChild(preview.renderDom());

    preview.open();
    preview.zoom(2);
    const stage = document.querySelector('.yoya-vimagepreview-stage');
    expect(stage.style.transform).toContain('scale(2)');
  });

  it('serializes deterministically for SSR', () => {
    const html = vImagePreview({ src: '/big.png', thumb: '/small.png' }).toHTML();

    expect(html).toContain('yoya-vimagepreview');
    expect(html).not.toContain('yoya-vimagepreview-overlay');
  });
});
