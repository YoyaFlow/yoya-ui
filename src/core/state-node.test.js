import { describe, expect, it, vi } from 'vitest';
import { div, vStateNode, vText } from '../index.js';

describe('vStateNode', () => {
  it('keeps render and uses update for state changes', () => {
    const render = vi.fn();
    const update = vi.fn();
    let text = null;
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        render();
        text = vText(String(state.count));
        return div(text);
      },
      update(state) {
        update();
        text.textContent(String(state.count));
      }
    });
    const element = component.render().renderDom();

    expect(element.textContent).toBe('0');
    expect(render).toHaveBeenCalledTimes(1);

    component.setState({ count: 3 });

    expect(element.textContent).toBe('3');
    expect(render).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(component.state()).toEqual({ count: 3 });
  });

  it('rebuilds the render result when update is omitted', () => {
    const render = vi.fn();
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        render();
        return div(vText(String(state.count)));
      }
    });
    const element = component.render().renderDom();

    expect(element.textContent).toBe('0');

    component.setState({ count: 2 });

    expect(element.textContent).toBe('2');
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('allows update to request a full rebuild by returning true', () => {
    const render = vi.fn();
    const update = vi.fn(() => true);
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        render();
        return div(vText(String(state.count)));
      },
      update
    });
    const element = component.render().renderDom();

    component.setState({ count: 1 });

    expect(element.textContent).toBe('1');
    expect(update).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('supports functional patches, subscribers, and destroy cleanup', () => {
    const listener = vi.fn();
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        return div(vText(String(state.count)));
      }
    });
    const unsubscribe = component.subscribe(listener);

    component.setState((state) => ({ count: state.count + 1 }));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }), component);

    unsubscribe();
    component.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);

    component.destroy();
  });

  it('works as an object component child', () => {
    function Counter() {
      return vStateNode({
        state: () => ({ count: 0 }),
        render(state) {
          return div(vText(String(state.count)));
        }
      });
    }

    const root = div((page) => page.child(Counter()));
    const element = root.renderDom();

    expect(element.textContent).toBe('0');

    root.destroy();
  });

  it('works as a parent shortcut', () => {
    const root = div((page) => {
      page.vStateNode({
        state: () => ({ count: 0 }),
        render(state) {
          return div(vText(String(state.count)));
        }
      });
    });
    const element = root.renderDom();

    expect(element.textContent).toBe('0');

    root.destroy();
  });

  it('requires a render function', () => {
    expect(() => vStateNode({ state: () => ({}) })).toThrow(
      'vStateNode requires a render function'
    );
  });

  it('exposes custom methods defined on the config object', () => {
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(state) {
        return div(vText(String(state.count)));
      },
      increment() {
        this.setState({ count: this.state().count + 1 });
        return this;
      },
      reset() {
        this.setState({ count: 0 });
      }
    });

    expect(typeof component.increment).toBe('function');
    expect(component.increment()).toBe(component);
    expect(component.state()).toEqual({ count: 1 });

    component.reset();
    expect(component.state()).toEqual({ count: 0 });
  });

  it('keeps update and config render internal to vStateNode', () => {
    const configRender = vi.fn(() => div(vText('0')));
    const update = vi.fn();
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render: configRender,
      update
    });

    expect(component.update).toBeUndefined();
    expect(component.render()).toBe(component.render());

    component.setState({ count: 1 });

    expect(configRender).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('throws when a custom method collides with the built-in API', () => {
    expect(() =>
      vStateNode({
        state: () => ({ count: 0 }),
        render() {
          return div(vText('0'));
        },
        setState() {}
      })
    ).toThrow(/conflicts with the built-in API/);
  });
});
