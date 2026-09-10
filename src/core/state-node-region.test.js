import { describe, expect, it } from 'vitest';
import { div, vStateNode } from '../index.js';

describe('vStateNode region auto trigger', () => {
  it('flushes region values without rebuilding when the predicate refuses', () => {
    let renders = 0;
    const component = vStateNode({
      state: () => ({ count: 0 }),
      render(_state) {
        renders += 1;
        return div((ele) => {
          ele.rebuildable(() => false);
          ele.attr('data-count', (s) => String(s.count));
        });
      }
    });
    const host = div().child(component);
    const element = host.renderDom();
    const regionElement = element.firstElementChild;
    expect(regionElement.getAttribute('data-count')).toBe('0');

    component.setState({ count: 1 });
    expect(regionElement.getAttribute('data-count')).toBe('1');
    expect(renders).toBe(1);
  });

  it('rebuilds only the marked region when the predicate allows it', () => {
    let renders = 0;
    const component = vStateNode({
      state: () => ({ mode: 'a' }),
      render(state) {
        renders += 1;
        return div((ele) => {
          ele.rebuildable();
          ele.span((label) => label.text(`mode=${state.mode}`));
        });
      }
    });
    const host = div().child(component);
    const element = host.renderDom();

    expect(element.textContent).toBe('mode=a');

    component.setState({ mode: 'b' });

    expect(element.textContent).toBe('mode=b');
    expect(renders).toBe(1);
  });

  it('defers state changes raised while rebuilding and applies them afterwards', () => {
    let nested = false;
    const component = vStateNode({
      state: () => ({ a: 0, b: 0 }),
      render(state, api) {
        return div((ele) => {
          ele.rebuildable();
          if (!nested && state.a > 0) {
            nested = true;
            api.setState({ b: state.a * 10 });
          }
          ele.text(`${state.a}/${state.b}`);
        });
      }
    });
    const host = div().child(component);
    const element = host.renderDom();

    component.setState({ a: 1 });

    expect(component.state()).toEqual({ a: 1, b: 10 });
    expect(element.textContent).toBe('1/10');
  });

  it('keeps working when the component is rendered but not mounted', () => {
    const component = vStateNode({
      state: () => ({ n: 0 }),
      render(state) {
        return div((ele) => {
          ele.rebuildable();
          ele.text(String(state.n));
        });
      }
    });

    component.render();
    component.setState({ n: 1 });

    const element = component.render().renderDom();

    expect(element.textContent).toBe('1');
  });
});
