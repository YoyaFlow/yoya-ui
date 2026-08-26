import { describe, expect, it, vi } from 'vitest';
import { div, vProgress } from '../index.js';

describe('vProgress', () => {
  it('renders a numeric progress value with semantic progressbar attrs', () => {
    const progress = vProgress(42);
    const element = progress.renderDom();
    const bar = element.querySelector('.yoya-vprogress-bar');

    expect(element.getAttribute('role')).toBe('progressbar');
    expect(element.getAttribute('aria-valuemin')).toBe('0');
    expect(element.getAttribute('aria-valuemax')).toBe('100');
    expect(element.getAttribute('aria-valuenow')).toBe('42');
    expect(element.dataset.value).toBe('42');
    expect(element.dataset.percent).toBe('42');
    expect(bar.style.width).toBe('42%');
    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('42%');
  });

  it('computes percent from max and supports percent updates', () => {
    const progress = vProgress({ max: 200, value: 50 });
    const element = progress.renderDom();

    expect(progress.value()).toBe(50);
    expect(progress.percent()).toBe(25);
    expect(element.getAttribute('aria-valuemax')).toBe('200');
    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('25%');

    progress.percent(50);

    expect(progress.value()).toBe(100);
    expect(progress.percent()).toBe(50);
    expect(element.querySelector('.yoya-vprogress-bar').style.width).toBe('50%');
  });

  it('supports statuses, custom color, label, size, and hidden text', () => {
    const progress = vProgress({
      label: '构建',
      size: 'small',
      status: 'success',
      value: 80
    });
    const element = progress.renderDom();
    const bar = element.querySelector('.yoya-vprogress-bar');

    expect(element.querySelector('.yoya-vprogress-label').textContent).toBe('构建');
    expect(element.dataset.status).toBe('success');
    expect(element.dataset.size).toBe('small');
    expect(element.dataset.hasLabel).toBe('true');
    expect(bar.style.background).toContain('var(--yoya-color-success');

    progress.strokeColor('#7c3aed');
    progress.showText(false);

    expect(bar.style.background).toBe('rgb(124, 58, 237)');
    expect(element.querySelector('.yoya-vprogress-text').style.display).toBe('none');
  });

  it('supports custom text and format callbacks', () => {
    const format = vi.fn((value, percent) => `${value}/${100} (${Math.round(percent)}%)`);
    const progress = vProgress({ format, value: 64 });
    const element = progress.renderDom();

    expect(format).toHaveBeenCalledWith(64, 64);
    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('64/100 (64%)');

    progress.text('发布中');

    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('发布中');
  });

  it('switches to indeterminate mode and clears aria-valuenow', () => {
    const progress = vProgress({ indeterminate: true, value: 30 });
    const element = progress.renderDom();
    const bar = element.querySelector('.yoya-vprogress-bar');

    expect(element.dataset.indeterminate).toBe('true');
    expect(element.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.style.animation).toContain('yoya-vprogress-indeterminate');
    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('处理中');

    progress.active(false);

    expect(element.dataset.indeterminate).toBeUndefined();
    expect(element.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.style.animation).toBe('');
  });

  it('supports object setup, shared element options, and callbacks', () => {
    let callbackNode = null;
    const progress = vProgress(
      { value: 10 },
      { attrs: { id: 'task-progress' }, style: { maxWidth: '320px' } },
      (node) => {
        callbackNode = node;
        node.value(65);
      }
    );
    const element = progress.renderDom();

    expect(callbackNode).toBe(progress);
    expect(element.id).toBe('task-progress');
    expect(element.style.maxWidth).toBe('320px');
    expect(element.querySelector('.yoya-vprogress-bar').style.width).toBe('65%');
  });

  it('registers vProgress as a parent shortcut and updates live', () => {
    const root = div();
    root.vProgress({ label: '部署', value: 64 });

    const progress = root.children()[0];
    const element = root.renderDom();

    expect(element.querySelector('.yoya-vprogress-label').textContent).toBe('部署');
    expect(element.querySelector('.yoya-vprogress-bar').style.width).toBe('64%');

    progress.value(88);

    expect(element.querySelector('.yoya-vprogress-bar').style.width).toBe('88%');
    expect(element.querySelector('.yoya-vprogress-text').textContent).toBe('88%');
  });

  it('accepts numeric strings and clamps values to max', () => {
    const progress = vProgress('45');
    const element = progress.renderDom();

    expect(element.getAttribute('aria-valuenow')).toBe('45');

    progress.value(120);

    expect(progress.value()).toBe(100);
    expect(element.getAttribute('aria-valuenow')).toBe('100');
  });
});
