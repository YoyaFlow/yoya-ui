import { describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';

describe('rebuildable region across component children', () => {
  it('activates regions declared inside plain component children', () => {
    const n = ref(0);
    const Panel = {
      render() {
        return div((ele) => {
          ele.rebuildable();
          ele.text(`n=${n.value}`);
        });
      }
    };
    const Ticker = {
      render() {
        return div((host) => {
          // 外层只是普通组件：内层区域必须在挂载时被激活，写入信号才会重建它。
          host.attr('data-tick', n);
          host.child(Panel);
        });
      }
    };
    const page = div().child(Ticker);
    const element = page.renderDom();

    expect(element.textContent).toBe('n=0');

    n.value = 1;

    expect(element.textContent).toBe('n=1');
  });

  it('does not rebuild nested regions when only values are flushed', () => {
    let innerBuilds = 0;
    const widget = {
      render() {
        innerBuilds += 1;
        return div((ele) => {
          ele.rebuildable(() => true);
          ele.text('inner');
        });
      }
    };
    const page = div((host) => {
      host.child(widget);
    });
    page.renderDom();

    expect(innerBuilds).toBe(1);

    page.flush();

    expect(innerBuilds).toBe(1);
  });
});
