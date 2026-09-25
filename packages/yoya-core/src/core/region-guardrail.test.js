import { afterEach, describe, expect, it, vi } from 'vitest';
import { div, ref } from '@yoyaflow/yoya-core';
import { disableDevtools, enableDevtools } from './devtools.js';

function spyOnWarn() {
  return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

describe('rebuildable dev guardrail', () => {
  afterEach(() => {
    disableDevtools();
    vi.restoreAllMocks();
  });

  it('warns when the region builder reads before rebuildable()', () => {
    const warn = spyOnWarn();
    enableDevtools();
    const count = ref(0);

    const host = div((box) => {
      box.attr('data-snapshot', count.value); // 声明之前读：不会成为依赖
      box.rebuildable();
      box.span(`n=${count.value}`); // 声明之后读：成为依赖
    });
    const element = host.renderDom();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('rebuildable()');
    expect(warn.mock.calls[0][0]).toContain('peek()');

    // 依赖语义不变：只有声明之后的读取驱动重建；重建时不重复报警
    count.value = 1;
    expect(element.textContent).toBe('n=1');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the region is declared first', () => {
    const warn = spyOnWarn();
    enableDevtools();
    const count = ref(0);

    div((box) => {
      box.rebuildable();
      box.span(`n=${count.value}`);
    }).renderDom();

    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent for peek() reads, which mean "read without subscribing"', () => {
    const warn = spyOnWarn();
    enableDevtools();
    const count = ref(0);

    div((box) => {
      box.attr('data-snapshot', count.peek());
      box.rebuildable();
      box.span(`n=${count.value}`);
    }).renderDom();

    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent for nodes that never declare a region', () => {
    const warn = spyOnWarn();
    enableDevtools();
    const count = ref(0);

    div((box) => {
      box.attr('data-snapshot', count.value);
      box.span(`${count.value} 条`);
    }).renderDom();

    expect(warn).not.toHaveBeenCalled();
  });

  it('stays silent while devtools is off', () => {
    const warn = spyOnWarn();
    const count = ref(0);

    div((box) => {
      box.attr('data-snapshot', count.value);
      box.rebuildable();
      box.span(`n=${count.value}`);
    }).renderDom();

    expect(warn).not.toHaveBeenCalled();
  });

  it('attributes nested builder reads to the nested node, not the region', () => {
    const warn = spyOnWarn();
    enableDevtools();
    const count = ref(0);

    div((box) => {
      box.div((inner) => {
        inner.attr('data-snapshot', count.value); // 记在内层节点名下
      });
      box.rebuildable();
      box.span(`n=${count.value}`);
    }).renderDom();

    expect(warn).not.toHaveBeenCalled();
  });
});
