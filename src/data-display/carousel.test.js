import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VCarousel, div, vCarousel } from '../index.js';

describe('vCarousel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders slides, dots and active slide state', () => {
    const carousel = vCarousel({
      height: '220px',
      loop: false,
      renderItem: (item) => div(item),
      slides: ['A', 'B', 'C']
    });
    const element = carousel.renderDom();

    expect(carousel).toBeInstanceOf(VCarousel);
    expect(element.classList.contains('yoya-vcarousel')).toBe(true);
    expect(element.querySelectorAll('.yoya-vcarousel-slide')).toHaveLength(3);
    expect(element.querySelectorAll('.yoya-vcarousel-dot')).toHaveLength(3);
    expect(element.querySelector('.yoya-vcarousel-track').style.transform).toBe('translateX(0%)');
    expect(element.dataset.active).toBe('0');
    expect(element.querySelector('.yoya-vcarousel-arrow--prev').disabled).toBe(true);
    expect(element.querySelector('.yoya-vcarousel-arrow--next').disabled).toBe(false);
  });

  it('wraps with loop and clamps without loop', () => {
    const carousel = vCarousel({
      renderItem: (item) => div(item),
      slides: ['A', 'B', 'C']
    });
    const element = carousel.renderDom();

    carousel.active(2);
    carousel.next();
    expect(carousel.active()).toBe(0);

    carousel.loop(false).active(2);
    carousel.next();
    expect(carousel.active()).toBe(2);
    expect(element.querySelector('.yoya-vcarousel-arrow--next').disabled).toBe(true);

    carousel.prev();
    expect(carousel.active()).toBe(1);
  });

  it('updates slides from dots and keyboard controls', () => {
    const carousel = vCarousel({
      renderItem: (item) => div(item),
      slides: ['A', 'B', 'C']
    });
    const element = carousel.renderDom();

    element.querySelectorAll('.yoya-vcarousel-dot')[2].click();
    expect(carousel.active()).toBe(2);
    expect(element.querySelector('.yoya-vcarousel-track').style.transform).toBe(
      'translateX(-200%)'
    );

    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
    expect(carousel.active()).toBe(1);

    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    expect(carousel.active()).toBe(0);
  });

  it('emits change events with the active index and count', () => {
    const changed = vi.fn();
    const carousel = vCarousel({
      renderItem: (item) => div(item),
      slides: ['A', 'B', 'C']
    });

    carousel.on('change', changed);
    carousel.renderDom();
    carousel.next();

    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          count: 3,
          index: 1
        })
      })
    );
  });

  it('autoplays with the configured interval and stops on destroy', () => {
    vi.useFakeTimers();
    const carousel = vCarousel({
      autoplay: true,
      interval: 1000,
      renderItem: (item) => div(item),
      slides: ['A', 'B']
    });
    const element = carousel.renderDom();

    expect(element.dataset.autoplay).toBe('true');

    vi.advanceTimersByTime(1000);
    expect(carousel.active()).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(carousel.active()).toBe(0);

    carousel.destroy();
    vi.advanceTimersByTime(3000);
    expect(carousel._timer).toBeNull();
  });

  it('hides arrows and dots when disabled', () => {
    const carousel = vCarousel({
      arrows: false,
      dots: false,
      renderItem: (item) => div(item),
      slides: ['A']
    });
    const element = carousel.renderDom();

    expect(element.querySelector('.yoya-vcarousel-arrow--prev').style.display).toBe('none');
    expect(element.querySelector('.yoya-vcarousel-arrow--next').style.display).toBe('none');
    expect(element.querySelector('.yoya-vcarousel-dots').style.display).toBe('none');
  });

  it('registers vCarousel as a parent shortcut', () => {
    const page = div((root) => {
      root.vCarousel({
        renderItem: (item) => div(item),
        slides: ['A', 'B']
      });
    });
    const element = page.renderDom();

    expect(element.querySelector('.yoya-vcarousel')).not.toBeNull();
    expect(element.querySelectorAll('.yoya-vcarousel-slide')).toHaveLength(2);
  });
});
