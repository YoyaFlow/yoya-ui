import { describe, expect, it } from 'vitest';
import {
  createAccess,
  createI18n,
  currentContext,
  div,
  installI18nStringShortcut,
  withAccess,
  withContext,
  withI18nStringShortcut
} from '../index.js';

describe('rebuildable region environment', () => {
  it('keeps inherited access state after rerun', () => {
    const access = createAccess({ permissions: ['r.area'] });
    let region = null;
    const host = div();

    withAccess(access, () => {
      host.child(
        div((gate) => {
          gate.access('area');
          gate.child(
            div((ele) => {
              region = ele;
              ele.rebuildable();
              ele.text('secret');
            })
          );
        })
      );
    });
    const regionElement = host.renderDom().firstElementChild.firstElementChild;

    expect(regionElement.getAttribute('aria-disabled')).toBe('true');

    region.rerun();

    expect(regionElement.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps context providers after rerun', () => {
    let region = null;
    const host = div();

    withContext({ tenant: 'acme' }, () => {
      host.child(
        div((ele) => {
          region = ele;
          ele.rebuildable();
          ele.attr('data-tenant', currentContext('tenant', 'none'));
        })
      );
    });

    const regionElement = host.renderDom().firstElementChild;

    expect(regionElement.getAttribute('data-tenant')).toBe('acme');

    region.rerun();

    expect(regionElement.getAttribute('data-tenant')).toBe('acme');
  });

  it('keeps the shortcut i18n instance after rerun', () => {
    const zh = createI18n({ language: 'zh-CN', messages: { 'zh-CN': { hello: '你好' } } });
    const en = createI18n({ language: 'en', messages: { en: { hello: 'Hello' } } });

    installI18nStringShortcut(zh);

    let region = null;
    const host = div();

    withI18nStringShortcut(en, () => {
      host.child(
        div((ele) => {
          region = ele;
          ele.rebuildable();
          ele.child('你好'.s('hello'));
        })
      );
    });

    const hostElement = host.renderDom();

    expect(hostElement.textContent).toBe('Hello');

    region.rerun();

    expect(hostElement.textContent).toBe('Hello');
  });
});
