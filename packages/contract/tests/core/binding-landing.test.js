/**
 * 读值绑定在「构建 → 落地」窗口里的**契约与对齐点**。
 *
 * 引擎是三段式（`ReactiveTarget` + `activateBindings`）：
 * 1. **构建期**求值一次（写节点快照，SSR 的 `toHTML()` 也吃这份）；
 * 2. **落地时对齐一次**：如果这个绑定读过的**源**在构建之后被写过（`deps.js` 的写入序号变了），
 *    就重新求值并提交 —— 那时还没订阅，收不到通知；源若此后不再变化，快照会**永远**停在
 *    构建期值（静默错值）。没有源的绑定（零参闭包）不在此列，"只求值一次"的契约照旧；
 * 3. **订阅接管**：落地之后写源原地更新。
 *
 * 于是"构建之后、落地之前"的写入（props 对象分派、位置参数、"建好就配置"、直接写句柄 props）
 * 都能进首屏，组件不需要任何收口代码。
 */
import { describe, expect, it } from 'vitest';
import { createComponentShortcut } from '@yoyaflow/yoya-ui/internal/components/shared.js';
import { span } from '@yoyaflow/yoya-core/html';
import { vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';

describe('读值绑定：构建 → 落地窗口', () => {
  it('落地对齐：构建后被写过的源，首屏就是新值', () => {
    const name = ref('a');
    const root = span({ vn: 'PBindProbe' }, (r) => r.child(vText(() => name.value)));

    name.value = 'b';

    expect(root.renderDom().textContent).toBe('b');
  });

  it('落地对齐：组件对象分派的 props 也进首屏', () => {
    const size = ref(1);
    const Probe = () =>
      vNode((api) => {
        api.setupObject = (config) => ((size.value = Number(config.size)), api);
        return span({ vn: 'PBindProbe2' }).style('width', () => `${size.value}px`);
      });

    expect(createComponentShortcut(Probe)({ size: 9 }).renderDom().style.width).toBe('9px');
  });

  it('契约：没有源的绑定（零参闭包）不会在落地时重算', () => {
    let evaluations = 0;
    const noise = ref(0); // 与这个绑定无关的写入（全局序号会变）
    const data = { label: 'a' };
    const root = span({ vn: 'PBindProbe7' }, (r) =>
      r.attr('data-probe', () => {
        evaluations += 1;
        return `p${data.label}`;
      })
    );

    noise.value = 1;
    const element = root.renderDom();

    expect(evaluations).toBe(1);
    expect(element.getAttribute('data-probe')).toBe('pa');

    data.label = 'b';
    root.flush();

    expect(evaluations).toBe(2);
    expect(element.getAttribute('data-probe')).toBe('pb');
  });

  it('纪律：写完状态后自己 flush()，首屏就是新值', () => {
    const name = ref('a');
    const root = span({ vn: 'PBindProbe3' }, (r) => r.child(vText(() => name.value)));

    name.value = 'b';
    root.flush();

    expect(root.renderDom().textContent).toBe('b');
  });

  it('纪律：结构随数据的内容用区域，写完状态后 rebuild() 一次', () => {
    const count = ref(0);
    const box = span({ vn: 'PBindProbe4' });

    box.setup((node) => {
      node.rebuildable();
      node.child(vText(() => String(count.value)));
    });
    count.value = 7;
    box.rebuild();

    expect(box.renderDom().textContent).toBe('7');
  });

  it('落地之后订阅接管：写状态即可，不必手动收口', () => {
    const count = ref(1);
    const wrap = span({ vn: 'PBindProbe5' }, (root) =>
      root.child(vText(() => String(count.value)))
    );
    const element = wrap.renderDom();

    count.value = 2;

    expect(element.textContent).toBe('2');
  });

  it('`node.setup(cb)` 的嵌套写法：回调里写状态，帧末自动收口', () => {
    const Probe = () =>
      vNode((api) => {
        const width = ref(1);
        api.width = (value) => ((width.value = Number(value)), api);
        return span({ vn: 'PBindProbe6' }, (box) => {
          box.style('width', () => `${width.value}px`);
        });
      });
    const vProbe = createComponentShortcut(Probe);

    // props 走调用、嵌套走 .setup()——回调里写状态，绑定要跟上
    const element = vProbe()
      .setup((probe) => probe.width(42))
      .renderDom();

    expect(element.style.width).toBe('42px');
  });
});
