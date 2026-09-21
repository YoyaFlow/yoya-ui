/**
 * 票 03 阶段 1：形态 B 的弃用提示。
 *
 * 只在 devtools 开启时提示（开发期口径）；同一个对象只提示一次；不改变任何行为。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, vNode } from '../yoya.core.js';
import { disableDevtools, enableDevtools } from './devtools.js';
import { hydrate, renderToString } from './ssr.js';

const shapeB = () => ({
  render: () => div({ class: 'shape-b' }, 'x'),
  label: () => 'shape-b'
});

afterEach(() => {
  disableDevtools();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('形态 B 弃用提示', () => {
  it('devtools 开启时，child(对象) 提示一次（同一对象不重复）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableDevtools();
    const component = shapeB();

    const page = div((root) => root.child(component));
    page.child(component);
    page.child(shapeB());

    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.filter((text) => text.includes('Shape B is deprecated'))).toHaveLength(2);
    expect(messages[0]).toContain('child()');
  });

  it('devtools 关闭时一声不响', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    div((root) => root.child(shapeB()));
    expect(warn).not.toHaveBeenCalled();
  });

  it('renderToString / hydrate 收到页面对象时同样提示', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableDevtools();

    const pageObject = { render: () => div({ class: 'page' }, 'page') };
    const { html } = renderToString(pageObject);
    document.body.innerHTML = `<div id="app">${html}</div>`;
    hydrate({ render: () => div({ class: 'page' }, 'page') }, '#app');

    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.filter((text) => text.includes('Shape B is deprecated'))).toHaveLength(2);
  });

  it('vNode 组件不受影响（内部不用对象组件拼装）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableDevtools();

    const card = vNode((api) => {
      api.label = () => 'vNode';
      return div({ class: 'card' });
    });
    div((root) => root.child(card));

    expect(warn).not.toHaveBeenCalled();
  });
});
