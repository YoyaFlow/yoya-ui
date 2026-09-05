import { describe, expect, it } from 'vitest';
import { disableDevtools } from '../yoya.devtools.js';
import { DevtoolsDocumentationPage } from './devtools-docs.js';

describe('devtools documentation page', () => {
  it('renders the reference inspector demo inside the docs shell', () => {
    const page = DevtoolsDocumentationPage();
    const view = page.render();
    const element = view.renderDom();

    expect(element.getAttribute('data-component-route-item')).toBe('guides:devtools');
    expect(element.querySelector('[data-devtools-inspector]')).toBeTruthy();

    view.destroy();
    disableDevtools();
  });
});
