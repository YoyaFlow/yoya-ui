/**
 * 公开入口面：跨入口的同名符号必须是**同一个绑定**。
 *
 * 背景（0.7.2 → 0.7.4）：barrel 里同时 `export * from '@yoyaflow/yoya-core'` 与
 * `export * from '@yoyaflow/yoya-core/tools'`，而 `applyElementOptions` 两边各有一份实现
 * （node 层原语 + 作者助手里逐字等价的包装）。ESM 把同名星导出判成歧义，**静默排除**这个名字：
 * `@yoyaflow/yoya-ui` 根入口因此丢了 0.7.0 就有的符号，消费者构建还会打
 * `[NAMESPACE_CONFLICT]`。现在实现只留节点层一份，`/tools` 与组件包 barrel 都是同绑定再导出。
 */
import { describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import * as coreTools from '@yoyaflow/yoya-core/tools';
import * as ui from '@yoyaflow/yoya-ui';
import * as uiCore from '@yoyaflow/yoya-ui/core';
import * as uiTools from '@yoyaflow/yoya-ui/tools';

describe('公开入口面', () => {
  it('applyElementOptions 在 core / core-tools / ui 的三个入口是同一绑定', () => {
    expect(typeof core.applyElementOptions, 'core 主入口缺 applyElementOptions').toBe('function');
    for (const [name, entry] of Object.entries({ coreTools, ui, uiCore, uiTools })) {
      expect(entry.applyElementOptions, `${name} 与 core 主入口不是同一绑定`).toBe(
        core.applyElementOptions
      );
    }
  });

  it('行为：{ attrs, style } 落到元素节点，非元素节点与无效 options 都安全返回', () => {
    const node = core.div();
    expect(core.applyElementOptions(node, { attrs: { id: 'x' }, style: { color: 'red' } })).toBe(
      node
    );
    expect(core.elementAttrs(node)).toEqual({ id: 'x' });
    expect(core.elementStyles(node)).toEqual({ color: 'red' });
    expect(core.applyElementOptions(node, null)).toBe(node);
    expect(core.applyElementOptions(node, [1, 2])).toBe(node);

    const text = core.vText('hi');
    expect(core.applyElementOptions(text, { attrs: { id: 'y' } })).toBe(text);
  });
});
