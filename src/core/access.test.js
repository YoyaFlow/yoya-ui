import { describe, expect, it } from 'vitest';
import {
  button,
  createAccess,
  currentAccess,
  div,
  input,
  installAccess,
  withAccess
} from '../index.js';
import { vInput } from '../form/index.js';
import { renderToString } from '../core/ssr.js';

describe('access control (core)', () => {
  it('createAccess honors bare (full) / r. (read-only) / w. (write)', () => {
    const bare = createAccess({ permissions: ['system:member'] });
    expect(bare.canRead('system:member')).toBe(true);
    expect(bare.canWrite('system:member')).toBe(true);

    const readOnly = createAccess({ permissions: ['r.system:member'] });
    expect(readOnly.canRead('system:member')).toBe(true);
    expect(readOnly.canWrite('system:member')).toBe(false);

    const writeOnly = createAccess({ permissions: ['w.system:member'] });
    expect(writeOnly.canRead('system:member')).toBe(true);
    expect(writeOnly.canWrite('system:member')).toBe(true);

    const denied = createAccess({ permissions: [] });
    expect(denied.canRead('system:member')).toBe(false);
    expect(denied.canWrite('system:member')).toBe(false);
  });

  it('super admin bypasses read/write checks', () => {
    const access = createAccess({ roles: ['super_admin'], permissions: [] });
    expect(access.canRead('system:member')).toBe(true);
    expect(access.canWrite('system:member')).toBe(true);
  });

  it('defaults to read gating and hides denied content (DOM + SSR)', () => {
    const access = createAccess({ permissions: [] });
    let html;
    let dom;
    withAccess(access, () => {
      html = div({ access: 'system:member' }).child('panel').toHTML();
      dom = div({ access: 'system:member' }).child('panel').renderDom();
    });
    expect(html).toBe('');
    expect(dom).toBeNull();
  });

  it('renders when read granted via bare / r. / w. grant', () => {
    const bare = createAccess({ permissions: ['system:member'] });
    let html;
    withAccess(bare, () => {
      html = div({ access: 'r.system:member' }).child('panel').toHTML();
    });
    expect(html).toContain('panel');
  });

  it('read-only grant disables interactive controls', () => {
    const access = createAccess({ permissions: ['r.system:member'] });
    let el;
    let html;
    withAccess(access, () => {
      const node = input({ type: 'text', access: 'system:member' });
      el = node.renderDom();
      html = node.toHTML();
    });
    expect(el.disabled).toBe(true);
    expect(html).toContain('disabled="disabled"');
  });

  it('bare grant gives the user full read-write access (editable)', () => {
    const access = createAccess({ permissions: ['system:member'] });
    let el;
    withAccess(access, () => {
      el = input({ type: 'text', access: 'system:member' }).renderDom();
    });
    expect(el.disabled).toBe(false);
    expect(el.readOnly).toBe(false);
  });

  it('write denied renders visible but read-only (disabled/readonly)', () => {
    const access = createAccess({ permissions: ['r.system:member'] });
    let el;
    let html;
    withAccess(access, () => {
      const node = input({ type: 'text', access: 'w.system:member' });
      html = node.toHTML();
      el = node.renderDom();
    });
    expect(el.disabled).toBe(true);
    expect(el.readOnly).toBe(true);
    expect(html).toContain('disabled="disabled"');
    expect(html).toContain('readonly="readonly"');
  });

  it('write grant stays editable', () => {
    const access = createAccess({ permissions: ['w.system:member'] });
    let el;
    withAccess(access, () => {
      el = input({ type: 'text', access: 'w.system:member' }).renderDom();
    });
    expect(el.disabled).toBe(false);
    expect(el.readOnly).toBe(false);
  });

  it('propagates write lock to subtree (child button disabled)', () => {
    const access = createAccess({ permissions: ['r.system:member'] });
    let el;
    let html;
    withAccess(access, () => {
      const node = div({ access: 'w.system:member' }).child(button('Save'));
      el = node.renderDom();
      html = node.toHTML();
    });
    expect(el.querySelector('button').disabled).toBe(true);
    expect(html).toContain('<button disabled="disabled"');
  });

  it('disables inner control of composite vInput on write deny', () => {
    const access = createAccess({ permissions: ['r.system:member'] });
    let el;
    withAccess(access, () => {
      el = vInput({ name: 'name', access: 'w.system:member' }).renderDom();
    });
    expect(el.querySelector('input').disabled).toBe(true);
  });

  it('w implies r: holding w.code renders read-declared nodes', () => {
    const access = createAccess({ permissions: ['w.system:member'] });
    let html;
    withAccess(access, () => {
      html = div({ access: 'system:member' }).child('panel').toHTML();
    });
    expect(html).toContain('panel');
  });

  it('no access declared renders normally without a context (fail-open)', () => {
    const node = div('panel');
    expect(node.toHTML()).toContain('panel');
    expect(node.renderDom()).not.toBeNull();
  });

  it('access() chain setter works and toHTML reflects deny', () => {
    const access = createAccess({ permissions: [] });
    let html;
    withAccess(access, () => {
      html = div('panel').access('w.system:member').toHTML();
    });
    expect(html).toBe('');
  });

  it('restores the previous access context after withAccess', () => {
    const outer = createAccess({ permissions: ['r.a'] });
    const inner = createAccess({ permissions: ['w.b'] });
    withAccess(outer, () => {
      expect(currentAccess()).toBe(outer);
      withAccess(inner, () => expect(currentAccess()).toBe(inner));
      expect(currentAccess()).toBe(outer);
    });
    expect(currentAccess()).toBeNull();
  });

  it('scope propagates to descendants (whole block read-only)', () => {
    const access = createAccess({ permissions: ['r.form:member'] });
    let el;
    withAccess(access, () => {
      el = div({ access: 'form:member' })
        .child(input())
        .child(vInput({ name: 'name' }))
        .renderDom();
    });
    expect(el.querySelector('input').disabled).toBe(true);
    expect(el.querySelector('input.yoya-vinput').disabled).toBe(true);
  });

  it('child declaration overrides inherited scope (nearest wins)', () => {
    const access = createAccess({ permissions: ['r.form:member', 'system:export'] });
    let el;
    withAccess(access, () => {
      el = div({ access: 'form:member' })
        .child(input())
        .child(button('导出').access('system:export'))
        .renderDom();
    });
    expect(el.querySelector('input').disabled).toBe(true);
    expect([...el.querySelectorAll('button')][0].disabled).toBe(false);
  });

  it('installAccess sets a global context used by rendering', () => {
    installAccess(createAccess({ permissions: [] }));
    try {
      expect(div({ access: 'system:member' }).child('panel').toHTML()).toBe('');
      installAccess(createAccess({ permissions: ['system:member'] }));
      expect(div({ access: 'system:member' }).child('panel').toHTML()).toContain('panel');
    } finally {
      installAccess(null);
    }
  });

  it('nodes capture access context at build time', () => {
    let grantedNode;
    let deniedNode;
    withAccess(createAccess({ permissions: ['system:member'] }), () => {
      grantedNode = vInput({ name: 'name', access: 'system:member' });
    });
    withAccess(createAccess({ permissions: ['r.system:member'] }), () => {
      deniedNode = vInput({ name: 'name', access: 'system:member' });
    });

    // 作用域已恢复，仍按各自构建时捕获的上下文渲染
    const grantedEl = grantedNode.renderDom();
    const deniedEl = deniedNode.renderDom();
    expect(grantedEl.querySelector('input').disabled).toBe(false);
    expect(deniedEl.querySelector('input').disabled).toBe(true);
  });

  it('switches permissions in place without rebuilding (hot swap)', () => {
    installAccess(createAccess({ permissions: ['r.system:member'] }));
    try {
      const root = div();
      root.child(vInput({ name: 'name', access: 'system:member' }));
      const el = root.renderDom();

      expect(el.querySelector('input').disabled).toBe(true);

      // 降为无权限：隐藏 → 已挂载 DOM 被移除
      currentAccess().setPermissions([]);
      root.renderDom();
      expect(el.querySelector('input')).toBeNull();

      // 升为完整：重新挂载且可编辑
      currentAccess().setPermissions(['system:member']);
      root.renderDom();
      const input = el.querySelector('input');
      expect(input).not.toBeNull();
      expect(input.disabled).toBe(false);
    } finally {
      installAccess(null);
    }
  });

  it('renderToString scopes access via options.access', () => {
    const denied = createAccess({ permissions: [] });
    const granted = createAccess({ permissions: ['system:member'] });

    const hidden = renderToString(div({ access: 'system:member' }).child('panel'), {
      access: denied
    });
    expect(hidden.html).not.toContain('panel');

    const shown = renderToString(div({ access: 'system:member' }).child('panel'), {
      access: granted
    });
    expect(shown.html).toContain('panel');
  });

  it('setPermissions updates grants for the same context', () => {
    const access = createAccess({ permissions: [] });
    expect(access.canRead('system:member')).toBe(false);
    access.setPermissions(['w.system:member']);
    expect(access.canWrite('system:member')).toBe(true);
  });
});
