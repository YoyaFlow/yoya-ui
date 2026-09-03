import { describe, expect, it } from 'vitest';
import {
  clearInstalledContext,
  currentContext,
  div,
  installContext,
  withContext
} from '../index.js';
import { renderToString } from '../core/ssr.js';

describe('generic context (core)', () => {
  it('withContext provides values and restores the outer scope', () => {
    installContext({ user: 'global' });
    const seen = [];
    withContext({ user: 'alice', store: 'a' }, () => {
      seen.push(currentContext('user'));
      seen.push(currentContext('store'));
    });
    seen.push(currentContext('user'));
    expect(seen).toEqual(['alice', 'a', 'global']);
    clearInstalledContext();
  });

  it('nested withContext resolves the nearest layer', () => {
    withContext({ user: 'outer' }, () => {
      withContext({ user: 'inner', extra: 1 }, () => {
        expect(currentContext('user')).toBe('inner');
        expect(currentContext('extra')).toBe(1);
      });
      expect(currentContext('user')).toBe('outer');
      expect(currentContext('extra')).toBeUndefined();
    });
    expect(currentContext('user')).toBeUndefined();
  });

  it('currentContext returns defaultValue when missing', () => {
    expect(currentContext('missing', 'fallback')).toBe('fallback');
  });

  it('installContext acts as a global fallback', () => {
    installContext({ user: 'system' });
    expect(currentContext('user')).toBe('system');
    installContext({ user: 'other' });
    expect(currentContext('user')).toBe('other');
    clearInstalledContext();
    expect(currentContext('user')).toBeUndefined();
  });

  it('SSR entry scopes context per request and isolates state', () => {
    function Page(state) {
      return div(currentContext('scope') === state.scope ? 'match' : 'mismatch');
    }
    const htmlA = renderToString(Page, {
      state: { scope: 'scoped-A' },
      context: (state) => ({ scope: state.scope })
    });
    const htmlB = renderToString(Page, {
      state: { scope: 'scoped-B' },
      context: (state) => ({ scope: state.scope })
    });
    expect(htmlA.html).toContain('match');
    expect(htmlB.html).toContain('match');
    expect(htmlA.html).not.toContain('mismatch');
    expect(currentContext('scope')).toBeUndefined();
  });

  it('empty context option does not break rendering', () => {
    const html = renderToString(() => div('ok'), { state: {} });
    expect(html.html).toContain('ok');
  });
});

