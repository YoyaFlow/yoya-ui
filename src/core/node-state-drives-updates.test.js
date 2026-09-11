import { describe, expect, it } from 'vitest';
import { div, vText } from '../index.js';

describe('node state drives updates', () => {
  it('seeds node state and feeds parameterized bindings from it', () => {
    const box = div((ele) => {
      ele.state({ count: 1, open: false });
      ele.attr('data-count', (s) => String(s.count));
      ele.attr('data-open', (s) => String(s.open));
    });
    const element = box.renderDom();

    expect(element.getAttribute('data-count')).toBe('1');
    expect(element.getAttribute('data-open')).toBe('false');
  });

  it('flushes bindings after setState with a single key', () => {
    const box = div((ele) => {
      ele.state({ count: 1 });
      ele.span((line) => line.child(vText((s) => `n=${s.count}`)));
    });
    const element = box.renderDom();

    box.setState('count', 2);

    expect(element.textContent).toBe('n=2');
  });

  it('treats a patch exactly like a single key', () => {
    const box = div((ele) => {
      ele.state({ count: 1, open: false });
      ele.attr('data-count', (s) => String(s.count));
      ele.attr('data-open', (s) => String(s.open));
    });
    const element = box.renderDom();

    box.setState({ count: 2, open: true });

    expect(element.getAttribute('data-count')).toBe('2');
    expect(element.getAttribute('data-open')).toBe('true');
  });

  it('keeps seeded values across a rebuild', () => {
    const box = div((ele) => {
      ele.rebuildable();
      ele.state({ open: false });
      ele.attr('data-open', (s) => String(s.open));
    });
    box.renderDom();

    box.setState('open', true);
    expect(box.attr('data-open')).toBe('true');

    box.rebuild();

    expect(box.getBooleanState('open')).toBe(true);
    expect(box.attr('data-open')).toBe('true');
  });

  it('does not flush or rebuild while a setup is running', () => {
    let builds = 0;
    const box = div((ele) => {
      builds += 1;
      ele.rebuildable();
      ele.state({ n: 0 });
      ele.attr('data-n', (s) => String(s.n));
      if (builds === 1) {
        ele.setState('n', 5); // 构建期：只写状态
      }
    });
    const element = box.renderDom();

    expect(builds).toBe(1);
    expect(element.getAttribute('data-n')).toBe('5');
  });

  it('rebuilds a region when setState is called on it', () => {
    let builds = 0;
    const box = div((ele) => {
      builds += 1;
      ele.rebuildable();
      ele.state({ n: 1 });
      ele.span(`n=${ele.getNumberState('n')}`);
    });
    const element = box.renderDom();

    expect(element.textContent).toBe('n=1');

    box.setState('n', 2);

    expect(element.textContent).toBe('n=2');
    expect(builds).toBe(2);
  });

  it('defers a setState raised while flushing', () => {
    let node = null;
    const box = div((ele) => {
      node = ele;
      ele.state({ a: 1, b: 0 });
      ele.attr('data-a', (s) => {
        if (s.a === 2 && s.b === 0) {
          node.setState('b', 1); // 求值期间再写状态 → 排队到本轮之后
        }
        return String(s.a);
      });
      ele.attr('data-b', (s) => String(s.b));
    });
    const element = box.renderDom();

    box.setState('a', 2);

    expect(element.getAttribute('data-a')).toBe('2');
    expect(element.getAttribute('data-b')).toBe('1');
  });
});
