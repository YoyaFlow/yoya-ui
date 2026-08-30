import { describe, expect, it } from 'vitest';
import { vCarousel, vDialog, vMessageManager, vScroll, vTooltip } from './index.js';
import { hydrate, renderToString } from './yoya.ssr.js';

describe('browser-only components hydration', () => {
  it('opens a tooltip after hydration', () => {
    const page = () => vTooltip({ content: '提示', trigger: 'manual' });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const tooltip = hydrate(page, '#app');
    tooltip.open(true);

    expect(tooltip.renderDom().dataset.open).toBe('true');
    expect(document.querySelector('#app .yoya-vtooltip-panel').getAttribute('aria-hidden')).toBe(
      'false'
    );
  });

  it('opens and closes a dialog after hydration', () => {
    const page = () => vDialog({ title: '对话框' });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const dialog = hydrate(page, '#app');
    const element = dialog.renderDom();

    dialog.open(true);
    expect(element.hasAttribute('open')).toBe(true);

    dialog.close();
    expect(element.hasAttribute('open')).toBe(false);
  });

  it('navigates a carousel after hydration', () => {
    const page = () => vCarousel({ slides: ['A', 'B', 'C'] });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const carousel = hydrate(page, '#app');
    carousel.next();

    expect(carousel.active()).toBe(1);
  });

  it('shows a message after hydration', () => {
    const page = () => vMessageManager();
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const host = hydrate(page, '#app');
    host.show('已保存');

    expect(document.querySelector('#app .yoya-vmessage')).not.toBeNull();
    expect(document.querySelector('#app .yoya-vmessage').textContent).toContain('已保存');
  });

  it('keeps a virtual scroll interactive after hydration', () => {
    const items = Array.from({ length: 500 }, (_, index) => `项目 ${index}`);
    const page = () => vScroll({ items, itemHeight: 40, virtual: true });
    const { html } = renderToString(page);
    document.body.innerHTML = `<div id="app">${html}</div>`;

    const scroll = hydrate(page, '#app');
    const rows = document.querySelectorAll('#app .yoya-vscroll-virtual-item');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(500);
    expect(scroll.renderDom().dataset.virtual).toBe('true');
  });
});
