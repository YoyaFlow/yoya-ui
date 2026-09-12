import { describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';
import { disableDevtools, enableDevtools, subscribeDevtools } from './devtools.js';

describe('binding ownership without a declared scope', () => {
  it('evaluates a zero-argument binding on a standalone node at build time', () => {
    const data = { x: 'v' };
    const box = div((ele) => ele.attr('data-x', () => data.x));
    const element = box.renderDom();

    expect(element.getAttribute('data-x')).toBe('v');

    data.x = 'next';
    box.flush();

    expect(element.getAttribute('data-x')).toBe('next');
  });

  it('still rejects a parameterized binding without a source', () => {
    expect(() => div((ele) => ele.attr('data-x', (source) => String(source.x)))).toThrow(
      /no longer supported/
    );
  });

  it('is not re-evaluated by an unrelated rebuild', () => {
    const data = { label: 'A' };
    const box = div((ele) => ele.attr('data-label', () => data.label));
    const tick = ref(0);
    const panel = div((host) => {
      host.rebuildable();
      host.text(`tick=${tick.value}`);
    });
    div().child(panel).child(box).renderDom();

    data.label = 'B';
    tick.value = 1;

    expect(box.attr('data-label')).toBe('A');

    box.flush();

    expect(box.attr('data-label')).toBe('B');
  });

  it('does not write the DOM when the value is unchanged', () => {
    const data = { label: 'A' };
    const box = div((ele) => ele.attr('data-label', () => data.label));
    box.renderDom();

    const events = [];
    disableDevtools();
    enableDevtools();
    const unsubscribe = subscribeDevtools((event) => {
      if (event.type === 'attr' || event.type === 'text') {
        events.push(event);
      }
    });

    box.flush();
    box.flush();

    expect(events).toHaveLength(0);

    unsubscribe();
    disableDevtools();
  });

  it('evaluates a build-time binding once, not on every render', () => {
    let attempt = 0;
    const region = div((ele) => {
      ele.rebuildable();
      attempt += 1;
      if (attempt > 1) {
        throw new Error('boom');
      }
    });

    // 先制造一次「重跑失败」——失败回滚会释放本轮登记、尚未求值的绑定。
    expect(() => region.rebuild()).toThrow('boom');

    let probeEvaluations = 0;
    const probe = div((ele) =>
      ele.attr('data-probe', () => {
        probeEvaluations += 1;
        return 'p';
      })
    );
    probe.renderDom();
    probe.renderDom();

    // 首屏构建期求值一次；后续渲染不重复求值。
    expect(probeEvaluations).toBe(1);
  });
});
