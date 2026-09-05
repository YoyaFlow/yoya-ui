import { describe, expect, it, vi } from 'vitest';
import { div, vStateNode, vText } from '../index.js';

describe('vStateNode function-value bindings', () => {
  it('keeps bound vText in sync without manual update or rebuild', () => {
    const render = vi.fn();
    const component = vStateNode({
      state: () => ({ name: 'yoya' }),
      render() {
        render();
        return div(vText((s) => `hello ${s.name}`));
      }
    });
    const element = component.render().renderDom();

    expect(element.textContent).toBe('hello yoya');
    expect(render).toHaveBeenCalledTimes(1);

    component.setState({ name: 'ui' });

    expect(element.textContent).toBe('hello ui');
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('keeps bound attrs in sync and resolves snapshot reads', () => {
    let box = null;
    const component = vStateNode({
      state: () => ({ busy: false }),
      render() {
        box = div().attr('data-busy', (s) => (s.busy ? 'true' : null));
        return box;
      }
    });
    const element = component.render().renderDom();

    expect(element.getAttribute('data-busy')).toBeNull();

    component.setState({ busy: true });

    expect(element.getAttribute('data-busy')).toBe('true');
    expect(box.attr('data-busy')).toBe('true');

    component.setState({ busy: false });

    expect(element.getAttribute('data-busy')).toBeNull();
    expect(box.attr('data-busy')).toBeUndefined();
  });

  it('keeps bound inline styles in sync including null removal', () => {
    let panel = null;
    const component = vStateNode({
      state: () => ({ saving: false }),
      render() {
        panel = div().styles({
          display: 'block',
          opacity: (s) => (s.saving ? '0.65' : null),
          cursor: (s) => (s.saving ? 'wait' : 'default')
        });
        return panel;
      }
    });
    const root = component.render();

    expect(panel.style('opacity')).toBeUndefined();
    expect(panel.style('cursor')).toBe('default');

    const element = root.renderDom();

    expect(element.style.display).toBe('block');
    expect(element.style.opacity).toBe('');
    expect(element.style.cursor).toBe('default');

    component.setState({ saving: true });

    expect(element.style.opacity).toBe('0.65');
    expect(element.style.cursor).toBe('wait');

    component.setState({ saving: false });

    expect(element.style.opacity).toBe('');
    expect(element.style.cursor).toBe('default');
    expect(panel.style('opacity')).toBeUndefined();
  });

  it('rebuilds when update requests it even when bindings exist', () => {
    const render = vi.fn();
    const component = vStateNode({
      state: () => ({ label: 'x', visible: true }),
      render() {
        render();
        return div(vText((s) => (s.visible ? s.label : 'hidden')));
      },
      update(state, api, changed) {
        return changed.has('visible');
      }
    });
    const host = div().child(component);
    const element = host.renderDom();

    component.setState({ label: 'y' });

    expect(element.textContent).toBe('y');
    expect(render).toHaveBeenCalledTimes(1);

    component.setState({ visible: false });

    expect(element.textContent).toBe('hidden');
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('serializes bound values in toHTML before DOM mount', () => {
    const component = vStateNode({
      state: () => ({ total: 42 }),
      render() {
        return div((box) => {
          box.attr('data-total', (s) => String(s.total));
          box.child(vText((s) => `${s.total} 条`));
        });
      }
    });
    const html = component.render().toHTML();

    expect(html).toContain('data-total="42"');
    expect(html).toContain('42 条');
  });

  it('rejects function values outside a vStateNode binding scope', () => {
    expect(() => div().attr('data-x', (s) => String(s))).toThrow(/vStateNode/);
    expect(() => vText((s) => String(s))).toThrow(/vStateNode/);
  });
});
