import { describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';

describe('rebuildable region across component children', () => {
  it('activates regions declared inside plain component children', () => {
    const n = ref(0);
    // 形态 A 薄工厂（票 07）：工厂直接返回视图，组件边界仍由引擎懒解析
    const Panel = () =>
      div((ele) => {
        ele.rebuildable();
        ele.child(`n=${n.value}`);
      });
    const Ticker = () =>
      div((host) => {
        // 外层只是普通组件：内层区域必须在挂载时被激活，写入信号才会重建它。
        host.attr('data-tick', n);
        host.child(Panel);
      });
    const page = div().child(Ticker);
    const element = page.renderDom();

    expect(element.textContent).toBe('n=0');

    n.value = 1;

    expect(element.textContent).toBe('n=1');
  });

  it('does not rebuild nested regions when only values are flushed', () => {
    let innerBuilds = 0;
    const widget = () => {
      innerBuilds += 1;
      return div((ele) => {
        ele.rebuildable(() => true);
        ele.child('inner');
      });
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
