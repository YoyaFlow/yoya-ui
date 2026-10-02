/**
 * `applyPropValue` 是**与 `asSignal` 等价的归一出口**（票集 `genui-wiring` 票 07）：
 * 给句柄就登记活值绑定（写数据即更新），给普通值就当场落位一次。
 *
 * 表单控件族（input / select / slider / timer…）用它把 props 接到节点上；门禁认它算归一中，
 * 所以这些组件不必为了对账改成 `asSignal` —— 这一条守的就是那个"等价"。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { applyPropValue } from './node.js';
import { createElementFactory } from './node.js';
import { ref } from './signals/handle.js';

describe('applyPropValue 的归一语义', () => {
  let host;
  let seen;

  beforeEach(() => {
    host = createElementFactory('div', undefined)();
    seen = [];
  });

  it('普通值：落位一次', () => {
    applyPropValue(host, 'plain', (next) => seen.push(next));

    expect(seen).toEqual(['plain']);
  });

  it('句柄：登记成活值，落地后写数据就更新（等价 asSignal + 绑定）', () => {
    const handle = ref('first');

    applyPropValue(host, handle, (next) => seen.push(next));

    expect(seen).toEqual(['first']);

    host.bindTo(document.body); // 落地：绑定在这里订阅
    handle.value = 'second';

    expect(seen).toEqual(['first', 'second']);
    expect(handle.value).toBe('second'); // 句柄本身没被换掉（不新建源）
  });
});
