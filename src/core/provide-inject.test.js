import { describe, expect, it } from 'vitest';
import {
  clearInstalledContext,
  createI18n,
  currentContext,
  div,
  inject,
  installContext,
  provide,
  ref,
  vCard,
  vCardBody,
  vDynamicLoader,
  vNode,
  withContext,
  withI18nStringShortcut
} from '../index.js';
import { renderToString } from './ssr.js';

const html = (node, options = {}) => renderToString(node, { state: {}, ...options }).html;

describe('provide / inject (core)', () => {
  it('injects a value provided by an ancestor built further up the call stack', () => {
    const page = div((root) => {
      provide('user', { name: 'Ada' });
      root.child(
        div((card) => {
          card.p(`用户：${inject('user').name}`);
        })
      );
    });

    expect(html(page)).toContain('用户：Ada');
  });

  it('resolves the nearest declaration and keeps siblings isolated', () => {
    const page = div((root) => {
      provide('theme', 'light');
      root.div(`左侧：${inject('theme')}`);
      root.div((panel) => {
        provide('theme', 'dark');
        panel.p(`右侧：${inject('theme')}`);
      });
      root.div(`同级：${inject('theme')}`);
    });

    const out = html(page);
    expect(out).toContain('左侧：light');
    expect(out).toContain('右侧：dark');
    expect(out).toContain('同级：light');
  });

  it('falls back to the call-site default when nothing is provided', () => {
    const page = div(`值：${inject('missing', 'fallback')}`);

    expect(html(page)).toContain('值：fallback');
  });

  it('supports symbol keys and treats an explicit undefined as provided', () => {
    const token = Symbol('token');
    const page = div((root) => {
      provide(token, undefined);
      root.p(inject(token, 'fallback') === undefined ? 'provided-undefined' : 'fallback');
    });

    expect(html(page)).toContain('provided-undefined');
  });

  it('reads a detached child built inside the providing frame', () => {
    const page = div((root) => {
      provide('store', { count: 1 });
      const card = div((body) => body.p(`count:${inject('store').count}`));
      root.child(card);
    });

    expect(html(page)).toContain('count:1');
  });

  it('supports the inherit-then-override pattern (inject before provide)', () => {
    const page = div((root) => {
      provide('config', { size: 'md', color: 'blue' });
      root.div((panel) => {
        const parent = inject('config');
        provide('config', { ...parent, color: 'red' });
        panel.p(`${inject('config').size}/${inject('config').color}`);
      });
    });

    expect(html(page)).toContain('md/red');
  });

  it('falls back to withContext layers and the installed context', () => {
    installContext({ locale: 'zh-CN' });
    try {
      const scoped = withContext({ tenant: 'acme', tenantLocal: 'local' }, () =>
        div((root) => {
          root.p(`scoped:${inject('tenant')}`);
          root.p(`global:${inject('locale')}`);
          root.p(`provided:${inject('tenantLocal', 'none')}`);
        })
      );
      expect(html(scoped)).toContain('scoped:acme');
      expect(html(scoped)).toContain('global:zh-CN');
      expect(html(scoped)).toContain('provided:local');
    } finally {
      clearInstalledContext();
    }
  });

  it('prefers a node-scoped provide over an outer withContext layer', () => {
    const page = withContext({ tenant: 'outer' }, () =>
      div((root) => {
        provide('tenant', 'inner');
        root.p(`tenant:${inject('tenant')}`);
      })
    );

    expect(html(page)).toContain('tenant:inner');
  });

  it('throws when provide() runs outside a build frame', () => {
    expect(() => provide('user', 'Ada')).toThrow(TypeError);
    expect(() => provide('user', 'Ada')).toThrow(/while building a node/);
  });

  it('keeps provides per request in SSR', () => {
    function Page(state) {
      provide('tenant', state.tenant);
      return div(`tenant:${inject('tenant')}`);
    }

    expect(html(Page, { state: { tenant: 'A' } })).toContain('tenant:A');
    expect(html(Page, { state: { tenant: 'B' } })).toContain('tenant:B');
    expect(html(Page, { state: { tenant: 'C' } })).not.toContain('tenant:B');
  });

  it('clears stale keys when a region rebuilds', () => {
    const show = ref(true);
    const panel = div((p) => {
      p.rebuildable();
      provide('stable', 'A');
      if (show.value) {
        provide('optional', 'B');
      }
      p.p(`stable:${inject('stable')} optional:${inject('optional', 'none')}`);
    });

    expect(html(panel)).toContain('stable:A optional:B');

    show.value = false;
    panel.rebuild();

    expect(html(panel)).toContain('stable:A optional:none');
  });

  it('reaches children nested through library components', () => {
    function Badge() {
      return vCard((node) => {
        node.vCardBody((body) => body.p(`徽标：${inject('badge', 'none')}`));
      });
    }

    const page = div((root) => {
      provide('badge', 'gold');
      root.child(Badge());
    });

    expect(html(page)).toContain('徽标：gold');
  });

  it('exposes provided values to nested components resolved lazily', () => {
    function Inner() {
      return vCardBody((body) => body.p(`内层：${inject('tenant', 'none')}`));
    }

    function Outer() {
      provide('tenant', 'acme');
      return div((root) => root.child(Inner()));
    }

    const page = div((root) => root.child(Outer()));

    expect(html(page)).toContain('内层：acme');
  });

  it('reaches views built asynchronously by vDynamicLoader', async () => {
    let loader = null;
    const page = div((root) => {
      provide('tenant', 'acme');
      loader = vDynamicLoader({
        views: { loaded: () => div(`async:${inject('tenant', 'none')}`) },
        loader: async () => ({ ok: true })
      });
      root.child(loader);
    });

    await loader.load();

    expect(html(page)).toContain('async:acme');
  });

  it('scopes declarations made inside a vNode setup to its own subtree', () => {
    const page = div((root) => {
      root.child(
        vNode((api) => {
          provide('slot', 'actions');
          api.open = () => {};
          return div(`inside:${inject('slot', 'none')}`);
        })
      );
      root.p(`sibling:${inject('slot', 'none')}`);
    });

    const out = html(page);
    expect(out).toContain('inside:actions');
    expect(out).toContain('sibling:none');
  });

  it('scopes declarations made inside a component definition to its own subtree', () => {
    const panel = () => {
      provide('slot', 'panel');
      return div(`panel:${inject('slot', 'none')}`);
    };
    const page = div((root) => {
      root.child(panel);
      root.p(`sibling:${inject('slot', 'none')}`);
    });

    const out = html(page);
    expect(out).toContain('panel:panel');
    expect(out).toContain('sibling:none');
  });
});

describe('component build environment survives deferred render', () => {
  it('keeps the withContext snapshot for a component rendered later', () => {
    function Card() {
      return div(`card:${currentContext('user', 'MISSING')}`);
    }

    const page = withContext({ user: 'ada' }, () => div((root) => root.child(Card())));

    expect(html(page)).toContain('card:ada');
  });

  it('keeps the i18n shortcut scope for a component rendered later', () => {
    function Card() {
      return div('你好'.s('greeting'));
    }

    const i18n = createI18n({ language: 'en', messages: { en: { greeting: 'hello' } } });
    const page = withI18nStringShortcut(i18n, () => div((root) => root.child(Card())));

    expect(html(page)).toContain('hello');
  });
});
