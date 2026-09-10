import { describe, expect, it } from 'vitest';
import { div, vStateNode } from '../index.js';

describe('rebuildable region across component children', () => {
  it('discovers regions declared inside plain component children', () => {
    const data = { n: 0 };
    const Panel = {
      render() {
        return div((ele) => {
          ele.rebuildable();
          ele.text(`n=${data.n}`);
        });
      }
    };
    const component = vStateNode({
      state: () => ({ tick: 0 }),
      render(_state) {
        return div((host) => {
          // 外层自带绑定：setState 只刷值、不重建，内层区域必须被真正发现才会更新。
          host.attr('data-tick', (s) => String(s.tick));
          host.child(Panel);
        });
      }
    });
    const host = div().child(component);
    const element = host.renderDom();

    expect(element.textContent).toBe('n=0');

    data.n = 1;
    component.setState({ tick: 1 });

    expect(element.textContent).toBe('n=1');
  });

  it('keeps nested state components as islands', () => {
    let innerBuilds = 0;
    const inner = vStateNode({
      state: () => ({ n: 0 }),
      render() {
        innerBuilds += 1;
        return div((ele) => {
          ele.rebuildable(() => true);
          ele.text('inner');
        });
      }
    });
    const outer = vStateNode({
      state: () => ({ n: 0 }),
      render() {
        return div((host) => {
          host.child(inner);
        });
      }
    });
    const host = div().child(outer);
    host.renderDom();

    expect(innerBuilds).toBe(1);

    outer.setState({ n: 1 });

    expect(innerBuilds).toBe(1);
  });
});
