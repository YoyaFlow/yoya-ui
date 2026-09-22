/**
 * 读值绑定在「构建 → 落地」窗口里的**契约与组件纪律**（VBadge 试点验出来的）。
 *
 * 引擎是两段式（`ReactiveTarget` + `activateBindings`）：
 * 1. **构建期**求值一次（写节点快照，SSR 的 `toHTML()` 也吃这份）；
 * 2. **落地时**（`renderDom` / 挂载）才订阅依赖，此后写入原地更新。
 *
 * 既有用例明确守着"构建期绑定只求值一次、后续渲染不重复求值"
 * （`src/core/binding-ownership.test.js` → `evaluates a build-time binding once, not on every render`），
 * 所以**落地不会重新求值**。于是"构建之后、落地之前"的写入（组件 props 正好落在这个窗口里：
 * props 在 build 之后才应用）不会被自动跟上——组件得自己收口：
 *
 * - 值 → `self.node().flush()`（只重求值绑定；值没变不写 DOM，幂等）；
 * - 结构 → 区域的 `rebuild()`（内容由 builder 重新产出）。
 *
 * 落地之后订阅接管，命令再写状态就不需要手动收口。
 */
import { describe, expect, it } from 'vitest';
import { createComponentShortcut } from '../components/shared.js';
import { span } from '../html/index.js';
import { vText } from './index.js';
import { ref } from './signals/handle.js';
import { vNode } from './v-node.js';

describe('读值绑定：构建 → 落地窗口', () => {
  it('契约：落地前的写入不会自动进首屏（构建期只求值一次）', () => {
    const name = ref('a');
    const root = span({ vn: 'PBindProbe' }, (r) => r.child(vText(() => name.value)));

    name.value = 'b';

    expect(root.renderDom().textContent).toBe('a');
  });

  it('契约：组件 props 驱动 ref 时同理（props 在 build 之后才应用）', () => {
    const size = ref(1);
    const Probe = () =>
      vNode((api) => {
        api.setupObject = (config) => ((size.value = Number(config.size)), api);
        return span({ vn: 'PBindProbe2' }).style('width', () => `${size.value}px`);
      });

    expect(createComponentShortcut(Probe)({ size: 9 }).renderDom().style.width).toBe('1px');
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
});
