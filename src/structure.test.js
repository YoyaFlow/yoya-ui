import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const existsInSrc = (path) => existsSync(new URL(path, import.meta.url));
const importFromSrc = (path) => import(new URL(path, import.meta.url).href);

describe('foundation module structure', () => {
  it('keeps large modules compact with concise file names', async () => {
    expect(existsInSrc('./core/index.js')).toBe(true);
    expect(existsInSrc('./core/node.js')).toBe(true);
    expect(existsInSrc('./core/node.test.js')).toBe(true);
    expect(existsInSrc('./core/i18n.js')).toBe(true);
    expect(existsInSrc('./html/index.js')).toBe(true);
    expect(existsInSrc('./svg/index.js')).toBe(true);
    expect(existsInSrc('./layout/index.js')).toBe(true);
    expect(existsInSrc('./components/index.js')).toBe(true);
    expect(existsInSrc('./router.js')).toBe(true);

    expect(existsInSrc('./core/attributes.js')).toBe(false);
    expect(existsInSrc('./core/dom.js')).toBe(false);
    expect(existsInSrc('./core/element-node.js')).toBe(false);
    expect(existsInSrc('./core/factory.js')).toBe(false);
    expect(existsInSrc('./core/html-escape.js')).toBe(false);
    expect(existsInSrc('./core/styles.js')).toBe(false);
    expect(existsInSrc('./core/view-node.js')).toBe(false);
    expect(existsInSrc('./core/view-node.test.js')).toBe(false);
    expect(existsInSrc('./html/html-element-node.js')).toBe(false);
    expect(existsInSrc('./svg/svg-element-node.js')).toBe(false);
    expect(existsInSrc('./elements')).toBe(false);

    const api = await importFromSrc('./index.js');
    const html = await importFromSrc('./html/index.js');
    const svg = await importFromSrc('./svg/index.js');
    const components = await importFromSrc('./components/index.js');

    expect(api.div).toBe(html.div);
    expect(api.svg).toBe(svg.svg);
    expect(api.flex).toBeTypeOf('function');
    expect(api.router).toBeTypeOf('function');
    expect(api.createRouter).toBeTypeOf('function');
    expect(api.Router).toBeTypeOf('function');
    expect(api.ElementNode).toBeTypeOf('function');
    expect(api.HtmlElementNode).toBeTypeOf('function');
    expect(api.SvgElementNode).toBeTypeOf('function');
    expect(api.circle).toBeUndefined();
    expect(api.vButton).toBe(components.vButton);
    expect(api.vCard).toBe(components.vCard);
    expect(api.toast).toBe(components.toast);
  });

  it('keeps core helpers available through the core entry', async () => {
    const api = await importFromSrc('./index.js');

    expect(api.escapeHtml('<node attr="value">')).toBe('&lt;node attr=&quot;value&quot;&gt;');
    expect(api.resolveTarget(document.body)).toBe(document.body);
    expect(api.SVG_NAMESPACE).toBe('http://www.w3.org/2000/svg');
  });
});
