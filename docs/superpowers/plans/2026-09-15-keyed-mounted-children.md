# Keyed / Mounted 子节点能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **更名记录（2026-09-15）**：本文写作时的条件挂载 API 名 `mounted()` 已更名为
> `mountable()`（避免与 Vue 生命周期钩子同名导致的静默误用），测试文件同步由
> `src/core/node-mounted.test.js` 改名为 `src/core/node-mountable.test.js`。
> 本文按当时的规格原样保留，**以下代码与签名里的 `mounted` 一律读作 `mountable`**；
> 当前口径以 `docs/`、`types/core.d.ts` 与 `src/` 为准。

**Goal:** 补齐显式列表协调与条件挂载：keyed 插入/移动原语、`keyed()` 信号驱动子项绑定、`mounted()` 条件挂载（DOM 隔离但状态保留）。

**Architecture:** 全部实现收敛在 `src/core/node.js`（沿用现有绑定管线 `registerNodeBinding` 与区域机制，不新建并行体系）。原语先行（Task 1-4：insertBefore / insertAfter / moveBefore / moveAfter / replaceChild），`keyed()` 是薄编排层（Task 5），`mounted()` 采用子声明 + 父收养、不引入 `_parent` 指针（Task 6），类型与文档最后收口（Task 7）。

**Tech Stack:** 纯 JS（无新依赖）、Vitest、现有 signals/binding/region 机制。

## Global Constraints

- 不修改独立函数 `bindWindowEvent` / `bindDocumentEvent` 的任何行为。
- 不引入隐式模板协调：`keyed()` 只做 membership + 顺序，内容更新交给行内信号或原位换新。
- 不改动区域弃建协议：`rebuildable()` 语义一行不动；`keyed()` 内部读信号走绑定自己的收集上下文，不泄漏给外层区域。
- 每个 Task 走 TDD：先写失败测试 → 确认失败原因正确 → 最小实现 → 转绿 → 提交。
- 提交信息用 Conventional Commits（`feat(core): ...`）。
- 分支 `feat/keyed-mounted-children` 从 `origin/main` 切出；Task 5 结束前依次通过 `npm run lint`、`npm run format:check`、`npm run typecheck`、`npm test`、`npm run build`。
- 全量测试若出现与本次改动无关的重型页面 5s 超时（机器高负载抖动模式），必须隔离复跑确认后再继续。

---

### Task 1: `insertBefore` 原语

**Files:**

- Modify: `src/core/node.js`（ViewNode 类，放在 `addChild` 之后）
- Test: `src/core/keyed-child.test.js`（追加用例）

**Interfaces:**

- Produces: `ViewNode.prototype.insertBefore(key: string|number, child: ViewNode|ComponentLike|string|number, beforeKey?: string|number|null): this`。`beforeKey` 为空追加到末尾；重复 key 抛 `TypeError`；`beforeKey` 不存在抛 `TypeError`；已渲染时用 `insertBefore` 插入 DOM。

- [x] **Step 1: 写失败测试**

在 `src/core/keyed-child.test.js` 的 `describe('keyed children', ...)` 内追加：

```js
it('inserts a keyed child before an existing key', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('c', div('C'));

  const returned = list.insertBefore('b', div('B'), 'a');

  expect(returned).toBe(list);
  expect(list.children().map((child) => child.textContent())).toEqual(['B', 'A', 'C']);
});

it('inserts into rendered DOM at the anchored position', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('c', div('C'));
  const element = list.renderDom();

  list.insertBefore('b', div('B'), 'c');

  expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);
});

it('appends when beforeKey is null and rejects unknown or duplicate keys', () => {
  const list = div();
  list.addChild('a', div('A'));

  list.insertBefore('z', div('Z'), null);
  expect(list.children().map((child) => child.textContent())).toEqual(['A', 'Z']);
  expect(() => list.insertBefore('q', div('Q'), 'missing')).toThrow(/insertBefore\(\)/);
  expect(() => list.insertBefore('a', div('A2'))).toThrow(/duplicate key/i);
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: FAIL，`list.insertBefore is not a function`。

- [x] **Step 3: 最小实现**

在 `src/core/node.js` 的 `addChild` 方法后插入：

```js
  /** 在 beforeKey 对应子节点之前插入 keyed 子节点；beforeKey 为空时追加到末尾。 */
  insertBefore(key, child, beforeKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    if (this._childKeys.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const hasBefore = beforeKey !== null && beforeKey !== undefined;
    const beforeNode = hasBefore ? this._childKeys.get(String(beforeKey)) : null;
    if (hasBefore && !beforeNode) {
      throw new TypeError(`insertBefore() requires an existing beforeKey "${String(beforeKey)}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    this._childKeys.set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals.delete(viewNode);

    const beforeIndex = beforeNode ? this._children.indexOf(beforeNode) : -1;
    if (beforeIndex === -1) {
      this._children.push(viewNode);
    } else {
      this._children.splice(beforeIndex, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const childElement = withRenderScope(this._access ?? currentInheritedScope(), () =>
        viewNode.renderDom()
      );
      if (childElement && childElement.parentNode !== this._el) {
        const beforeElement = beforeNode?._el;
        const anchor =
          beforeElement && beforeElement.parentNode === this._el ? beforeElement : null;
        this._el.insertBefore(childElement, anchor);
      }
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }
```

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: PASS（原有用例不回归）。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/keyed-child.test.js
git commit -m "feat(core): add insertBefore keyed primitive"
```

---

### Task 2: `insertAfter` 原语

**Files:**

- Modify: `src/core/node.js`（ViewNode 类，放在 `insertBefore` 之后）
- Test: `src/core/keyed-child.test.js`

**Interfaces:**

- Produces: `ViewNode.prototype.insertAfter(key: string|number, child: ViewNode|ComponentLike|string|number, afterKey?: string|number|null): this`。`afterKey` 为空时插入到**开头**（与 `insertBefore` 空参考 = 尾插对称）；重复 key / 未知 `afterKey` 抛 `TypeError`；DOM 插入锚点 = `afterKey` 元素之后第一个**已挂载**的兄弟（跳过被 `mounted` 摘除的节点），没有则追加。

- [x] **Step 1: 写失败测试**

在 `src/core/keyed-child.test.js` 的 `describe('keyed children', ...)` 内追加：

```js
it('inserts a keyed child after an existing key', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('c', div('C'));

  const returned = list.insertAfter('b', div('B'), 'a');

  expect(returned).toBe(list);
  expect(list.children().map((child) => child.textContent())).toEqual(['A', 'B', 'C']);
});

it('inserts into rendered DOM at the anchored position and prepends on null', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('c', div('C'));
  const element = list.renderDom();

  list.insertAfter('b', div('B'), 'a');
  expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);

  list.insertAfter('head', div('H'), null);
  expect([...element.children].map((child) => child.textContent)).toEqual(['H', 'A', 'B', 'C']);
});

it('rejects unknown afterKey and duplicate keys', () => {
  const list = div();
  list.addChild('a', div('A'));

  expect(() => list.insertAfter('q', div('Q'), 'missing')).toThrow(/insertAfter\(\)/);
  expect(() => list.insertAfter('a', div('A2'), null)).toThrow(/duplicate key/i);
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: FAIL，`list.insertAfter is not a function`。

- [x] **Step 3: 最小实现**

在 `insertBefore` 方法后插入：

```js
  /** 在 afterKey 对应子节点之后插入 keyed 子节点；afterKey 为空时插入到开头。 */
  insertAfter(key, child, afterKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    if (this._childKeys.has(rawKey)) {
      throw new TypeError(`duplicate key "${rawKey}"`);
    }

    const hasAfter = afterKey !== null && afterKey !== undefined;
    const afterNode = hasAfter ? this._childKeys.get(String(afterKey)) : null;
    if (hasAfter && !afterNode) {
      throw new TypeError(`insertAfter() requires an existing afterKey "${String(afterKey)}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    this._childKeys.set(rawKey, viewNode);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }
    this._pendingRemovals.delete(viewNode);

    const afterIndex = afterNode ? this._children.indexOf(afterNode) : -1;
    if (afterIndex === -1) {
      this._children.unshift(viewNode);
    } else {
      this._children.splice(afterIndex + 1, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const childElement = withRenderScope(this._access ?? currentInheritedScope(), () =>
        viewNode.renderDom()
      );
      if (childElement && childElement.parentNode !== this._el) {
        let anchor = null;
        if (afterNode) {
          // afterKey 之后第一个已挂载兄弟；跳过被 mounted 摘除的节点，找不到即追加
          for (let i = this._children.indexOf(afterNode) + 1; i < this._children.length; i += 1) {
            const sibling = this._children[i];
            if (sibling !== viewNode && sibling._el?.parentNode === this._el) {
              anchor = sibling._el;
              break;
            }
          }
        } else {
          const first = this._children.find(
            (sibling) => sibling !== viewNode && sibling._el?.parentNode === this._el
          );
          anchor = first?._el ?? null;
        }
        this._el.insertBefore(childElement, anchor);
      }
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    return this;
  }
```

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/keyed-child.test.js
git commit -m "feat(core): add insertAfter keyed primitive"
```

---

### Task 3: `moveBefore` / `moveAfter` 原语

**Files:**

- Modify: `src/core/node.js`（ViewNode 类，放在 `insertAfter` 之后）
- Test: `src/core/keyed-child.test.js`

**Interfaces:**

- Produces:
  - `ViewNode.prototype.moveBefore(key: string|number, beforeKey?: string|number|null): this` —— 把已有 keyed 子节点移动到参考之前；`beforeKey` 为空时移动到**末尾**。未知 key / `beforeKey` 抛 `TypeError`；`key === beforeKey` 为 no-op。
  - `ViewNode.prototype.moveAfter(key: string|number, afterKey?: string|number|null): this` —— 移动到参考之后；`afterKey` 为空时移动到**开头**。校验与 no-op 规则同上。
  - 两者 DOM 移动均用 `insertBefore`，节点身份保持；`moveAfter` 锚点跳过被 `mounted` 摘除的兄弟。

- [x] **Step 1: 写失败测试**

在 `src/core/keyed-child.test.js` 的 `describe('keyed children', ...)` 内追加：

```js
it('moves a keyed child before a reference with identity preserved', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('b', div('B'));
  list.addChild('c', div('C'));
  const element = list.renderDom();
  const nodeC = list.getChild('c');

  const returned = list.moveBefore('c', 'a');

  expect(returned).toBe(list);
  expect(list.getChild('c')).toBe(nodeC);
  expect(list.children().map((child) => child.textContent())).toEqual(['C', 'A', 'B']);
  expect([...element.children].map((child) => child.textContent)).toEqual(['C', 'A', 'B']);
  expect(element.children[0]).toBe(nodeC._el);
});

it('moves a keyed child to the end when beforeKey is null', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('b', div('B'));
  list.addChild('c', div('C'));
  const element = list.renderDom();

  list.moveBefore('a', null);

  expect([...element.children].map((child) => child.textContent)).toEqual(['B', 'C', 'A']);
});

it('moves a keyed child after a reference and to the start on null', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('b', div('B'));
  list.addChild('c', div('C'));
  const element = list.renderDom();
  const nodeA = list.getChild('a');

  list.moveAfter('a', 'c');
  expect([...element.children].map((child) => child.textContent)).toEqual(['B', 'C', 'A']);
  expect(element.children[2]).toBe(nodeA._el);

  list.moveAfter('a', null);
  expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B', 'C']);
});

it('treats self references as no-ops and validates inputs', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('b', div('B'));

  const before = list.moveBefore('a', 'a');
  expect(before.children().map((child) => child.textContent())).toEqual(['A', 'B']);
  expect(
    list
      .moveAfter('b', 'b')
      .children()
      .map((child) => child.textContent())
  ).toEqual(['A', 'B']);
  expect(() => list.moveBefore('missing', 'a')).toThrow(/moveBefore\(\)/);
  expect(() => list.moveAfter('a', 'missing')).toThrow(/moveAfter\(\)/);
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: FAIL，`list.moveBefore is not a function`。

- [x] **Step 3: 最小实现**

在 `insertAfter` 方法后插入：

```js
  /** 把已有 keyed 子节点移动到 beforeKey 之前；beforeKey 为空时移动到末尾。 */
  moveBefore(key, beforeKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const viewNode = this._childKeys.get(rawKey);
    if (!viewNode) {
      throw new TypeError(`moveBefore() requires an existing key "${rawKey}"`);
    }

    const hasBefore = beforeKey !== null && beforeKey !== undefined;
    const beforeNode = hasBefore ? this._childKeys.get(String(beforeKey)) : null;
    if (hasBefore && !beforeNode) {
      throw new TypeError(`moveBefore() requires an existing beforeKey "${String(beforeKey)}"`);
    }
    if (viewNode === beforeNode) {
      return this;
    }

    const currentIndex = this._children.indexOf(viewNode);
    if (currentIndex !== -1) {
      this._children.splice(currentIndex, 1);
    }
    const targetIndex = beforeNode ? this._children.indexOf(beforeNode) : this._children.length;
    this._children.splice(targetIndex === -1 ? this._children.length : targetIndex, 0, viewNode);
    this._childrenDirty = true;

    if (this._el && viewNode._el) {
      const anchor = beforeNode?._el?.parentNode === this._el ? beforeNode._el : null;
      this._el.insertBefore(viewNode._el, anchor);
    }

    return this;
  }

  /** 把已有 keyed 子节点移动到 afterKey 之后；afterKey 为空时移动到开头。 */
  moveAfter(key, afterKey = null) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const viewNode = this._childKeys.get(rawKey);
    if (!viewNode) {
      throw new TypeError(`moveAfter() requires an existing key "${rawKey}"`);
    }

    const hasAfter = afterKey !== null && afterKey !== undefined;
    const afterNode = hasAfter ? this._childKeys.get(String(afterKey)) : null;
    if (hasAfter && !afterNode) {
      throw new TypeError(`moveAfter() requires an existing afterKey "${String(afterKey)}"`);
    }
    if (viewNode === afterNode) {
      return this;
    }

    const currentIndex = this._children.indexOf(viewNode);
    if (currentIndex !== -1) {
      this._children.splice(currentIndex, 1);
    }
    const afterIndex = afterNode ? this._children.indexOf(afterNode) : -1;
    if (afterIndex === -1) {
      this._children.unshift(viewNode);
    } else {
      this._children.splice(afterIndex + 1, 0, viewNode);
    }
    this._childrenDirty = true;

    if (this._el && viewNode._el) {
      let anchor = null;
      if (afterNode) {
        for (let i = this._children.indexOf(afterNode) + 1; i < this._children.length; i += 1) {
          const sibling = this._children[i];
          if (sibling !== viewNode && sibling._el?.parentNode === this._el) {
            anchor = sibling._el;
            break;
          }
        }
      } else {
        const first = this._children.find(
          (sibling) => sibling !== viewNode && sibling._el?.parentNode === this._el
        );
        anchor = first?._el ?? null;
      }
      this._el.insertBefore(viewNode._el, anchor);
    }

    return this;
  }
```

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/keyed-child.test.js
git commit -m "feat(core): add moveBefore and moveAfter keyed primitives"
```

---

### Task 4: `replaceChild` 原语

**Files:**

- Modify: `src/core/node.js`（ViewNode 类，放在 `moveAfter` 之后）
- Test: `src/core/keyed-child.test.js`

**Interfaces:**

- Consumes: Task 1 的插入路径形状。
- Produces: `ViewNode.prototype.replaceChild(key: string|number, child: ViewNode|ComponentLike|string|number): this`。同 key 原位换新：`_children` 同槽位替换、`_childKeys` 同 key 指向新节点、DOM 新元素先 `insertBefore` 旧元素再销毁旧节点，邻居零扰动；新节点若声明了 `.mounted(cond)` 则在本插入路径同样收养（旧节点的挂载条件**不转移**——新节点自带新声明）；未知 key 抛 `TypeError`。

- [x] **Step 1: 写失败测试**

在 `src/core/keyed-child.test.js` 的 `describe('keyed children', ...)` 内追加：

```js
it('replaces a keyed child at the same slot without disturbing siblings', () => {
  const list = div();
  list.addChild('a', div('A'));
  list.addChild('b', div('B-old'));
  list.addChild('c', div('C'));
  const element = list.renderDom();
  const nodeA = list.getChild('a');
  const nodeC = list.getChild('c');

  const returned = list.replaceChild('b', div('B-new'));

  expect(returned).toBe(list);
  expect(list.getChild('b').textContent()).toBe('B-new');
  expect(list.getChild('a')).toBe(nodeA);
  expect(list.getChild('c')).toBe(nodeC);
  expect(list.children().map((child) => child.textContent())).toEqual(['A', 'B-new', 'C']);
  expect([...element.children].map((child) => child.textContent)).toEqual(['A', 'B-new', 'C']);
});

it('rejects unknown keys', () => {
  const list = div();

  expect(() => list.replaceChild('missing', div('X'))).toThrow(/replaceChild\(\)/);
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: FAIL，`list.replaceChild is not a function`。

- [x] **Step 3: 最小实现**

在 `moveAfter` 方法后插入：

```js
  /** 同 key 原位换新：旧节点销毁、新节点占据同一槽位，邻居不受影响。 */
  replaceChild(key, child) {
    assertRegionChildAllowed(this);

    const rawKey = String(key);
    const previous = this._childKeys.get(rawKey);
    if (!previous) {
      throw new TypeError(`replaceChild() requires an existing key "${rawKey}"`);
    }

    const viewNode = normalizeChildWithContext(this, child);
    if (typeof viewNode.attr === 'function') {
      viewNode.attr('data-row-key', rawKey);
    }

    this._childKeys.set(rawKey, viewNode);
    this._pendingRemovals.delete(viewNode);
    const index = this._children.indexOf(previous);
    if (index === -1) {
      this._children.push(viewNode);
    } else {
      this._children.splice(index, 1, viewNode);
    }
    this._childrenDirty = true;

    if (this._el) {
      const newElement = withRenderScope(this._access ?? currentInheritedScope(), () =>
        viewNode.renderDom()
      );
      const oldElement = previous._el;
      if (newElement && newElement.parentNode !== this._el) {
        const anchor = oldElement?.parentNode === this._el ? oldElement : null;
        this._el.insertBefore(newElement, anchor ?? resolveInsertAnchor(this, previous));
      }
      if (isDevtoolsEnabled() && !this._devtoolsRendering) {
        notifyDevtoolsMutation(this, 'child', { added: [ensureDevtoolsNodeId(viewNode)] });
      }
    }

    if (viewNode._mountCondition) {
      const condition = viewNode._mountCondition;
      viewNode._mountCondition = null;
      this._adoptMountCondition(viewNode, condition);
    }

    this._childMountStates.delete(previous);
    previous.destroy();

    return this;
  }
```

（`_adoptMountCondition` / `_childMountStates` 依赖 Task 6；Task 4 先落地时，实现里的收养与状态清理两段在 Task 6 一并补上，收养用例也移至 Task 6 测试文件。）

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/keyed-child.test.js`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/keyed-child.test.js
git commit -m "feat(core): add replaceChild keyed primitive"
```

---

### Task 5: `keyed()` 信号驱动子项绑定

**Files:**

- Create: `src/core/keyed-children.test.js`
- Modify: `src/core/node.js`（构造器 `_keyedSegments` 初始化、ViewNode 新增 `keyed()` 方法、模块级 sync 辅助函数放在 `registerRegionCleanup` 附近）

**Interfaces:**

- Consumes: Task 1/2 的锚点思想（内部不复用公开方法，走模块级辅助函数）。
- Produces:
  - `ViewNode.prototype.keyed(source: SignalHandle, build: (row, index) => ChildInput): this`
  - `ViewNode.prototype.keyed(source: SignalHandle, keyFn: (row, index) => string|number, build): this`
  - 语义：同 key 且行引用未变 → 复用节点（build 不重跑）；行引用变 → 原位换新；顺序变化 → `insertBefore` 保身份；源数组重复 key 抛错；`clearChildren()` 后自愈（死成员剪枝）。

- [x] **Step 1: 写失败测试**

创建 `src/core/keyed-children.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { div, li, ref, ul } from '../index.js';

describe('keyed children binding', () => {
  it('renders rows from a signal and reuses nodes across reorders', () => {
    const rows = ref([
      { id: 1, title: 'A' },
      { id: 2, title: 'B' }
    ]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.title)
      );
    });
    const element = list.renderDom();

    expect(element.textContent).toBe('AB');
    const firstItem = list.children()[0];

    rows.value = [...rows.value].reverse();

    expect(element.textContent).toBe('BA');
    expect(list.children()[1]).toBe(firstItem);
    expect(element.children[1]).toBe(firstItem._el);
  });

  it('keeps node identity when the row reference is unchanged', () => {
    const rowA = { id: 'a', title: 'A' };
    const rows = ref([rowA]);
    const builds = [];
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => {
          builds.push(row.id);
          return li(row.title);
        }
      );
    });
    list.renderDom();

    rows.value = [{ id: 'b', title: 'B' }, rowA];

    expect(builds).toEqual(['a', 'b']);
    expect(list.textContent()).toBe('BA');
  });

  it('replaces an item in place when its row reference changes', () => {
    const rows = ref([{ id: 1 }, { id: 2 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(`row-${row.id}`)
      );
    });
    const element = list.renderDom();
    const secondNode = list.children()[1];

    rows.value = [rows.value[0], { id: 2, version: 2 }];

    expect(list.children()[1]).not.toBe(secondNode);
    expect(element.textContent).toBe('row-1row-2');
  });

  it('adds, removes, and mixes with static siblings', () => {
    const rows = ref([{ id: 'x' }]);
    const list = ul((node) => {
      node.li('head');
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(`item-${row.id}`)
      );
      node.li('tail');
    });
    const element = list.renderDom();

    rows.value = [{ id: 'x' }, { id: 'y' }];
    expect(element.textContent).toBe('headitem-xitem-ytail');

    rows.value = [{ id: 'y' }];
    expect(element.textContent).toBe('headitem-ytail');
  });

  it('rejects duplicate row keys and non-signal sources', () => {
    const rows = ref([{ id: 1 }, { id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.id)
      );
    });
    list.renderDom();

    expect(() => {
      rows.value = [{ id: 1 }, { id: 1 }];
    }).toThrow(/duplicate/i);
    expect(() => div().keyed([], () => li('x'))).toThrow(/signal/i);
  });

  it('self-heals after clearChildren', () => {
    const rows = ref([{ id: 1 }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.id)
      );
    });
    list.renderDom();
    list.clearChildren();

    rows.value = [{ id: 3 }];

    expect(list.textContent()).toBe('3');
  });

  it('renders once on the server without subscribing', () => {
    const rows = ref([{ id: 1, title: 'A' }]);
    const list = ul((node) => {
      node.keyed(
        rows,
        (row) => row.id,
        (row) => li(row.title)
      );
    });

    expect(list.toHTML()).toBe('<ul><li>A</li></ul>');

    rows.value = [];
    expect(list.toHTML()).toBe('<ul><li>A</li></ul>');
  });
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/keyed-children.test.js`
Expected: FAIL，`node.keyed is not a function`。

- [x] **Step 3: 实现**

`src/core/node.js` 构造器 `_pendingRemovals` 附近追加：

```js
this._keyedSegments = [];
```

模块级辅助函数（放在 `registerRegionCleanup` 之后）：

```js
/** 解析插入锚点：从 fromNode 起向后找第一个已挂载的兄弟元素；找不到返回 null（追加）。 */
function resolveInsertAnchor(parent, fromNode) {
  if (!fromNode) {
    return null;
  }

  for (let i = parent._children.indexOf(fromNode) + 1; i < parent._children.length; i += 1) {
    const element = parent._children[i]._el;
    if (element?.parentNode === parent._el) {
      return element;
    }
  }

  return null;
}

function describeKeyedRowKey(rawKey) {
  return typeof rawKey === 'string' ? rawKey : 'row reference';
}

function destroyKeyedMember(parent, entry) {
  const index = parent._children.indexOf(entry.node);
  if (index !== -1) {
    parent._children.splice(index, 1);
  }
  parent._childrenDirty = true;
  entry.node.destroy();
}

function placeKeyedMember(parent, entry, beforeNode) {
  parent._pendingRemovals.delete(entry.node);
  const beforeIndex = beforeNode ? parent._children.indexOf(beforeNode) : -1;
  if (beforeIndex === -1) {
    parent._children.push(entry.node);
  } else {
    parent._children.splice(beforeIndex, 0, entry.node);
  }
  parent._childrenDirty = true;

  if (parent._el) {
    const element = withRenderScope(parent._access ?? currentInheritedScope(), () =>
      entry.node.renderDom()
    );
    if (element && element.parentNode !== parent._el) {
      const anchor = beforeNode?._el?.parentNode === parent._el ? beforeNode._el : null;
      parent._el.insertBefore(element, anchor ?? resolveInsertAnchor(parent, beforeNode));
    }
    if (isDevtoolsEnabled() && !parent._devtoolsRendering) {
      notifyDevtoolsMutation(parent, 'child', { added: [ensureDevtoolsNodeId(entry.node)] });
    }
  }
}

function syncKeyedSegment(parent, segment, rows) {
  const list = Array.isArray(rows) ? rows : [];
  const members = segment.members;

  members.forEach((entry, rawKey) => {
    if (entry.node._deleted) {
      members.delete(rawKey);
    }
  });

  const desired = [];
  const seen = new Set();
  list.forEach((row, index) => {
    const rawKey = segment.keyFn ? segment.keyFn(row, index) : row;
    if (seen.has(rawKey)) {
      throw new TypeError(`keyed() duplicate row key: ${describeKeyedRowKey(rawKey)}`);
    }
    seen.add(rawKey);
    desired.push({ rawKey, row, index });
  });

  const keep = new Set(
    desired
      .filter((item) => {
        const existing = members.get(item.rawKey);
        return existing && existing.row === item.row;
      })
      .map((item) => item.rawKey)
  );
  members.forEach((entry, rawKey) => {
    if (!keep.has(rawKey)) {
      destroyKeyedMember(parent, entry);
      members.delete(rawKey);
    }
  });

  const next = desired.map((item) => {
    const existing = members.get(item.rawKey);
    if (existing) {
      return { ...item, node: existing.node };
    }

    const node = normalizeChildWithContext(parent, segment.build(item.row, item.index));
    const entry = { rawKey: item.rawKey, row: item.row, node };
    members.set(item.rawKey, entry);
    if (
      typeof node.attr === 'function' &&
      (typeof item.rawKey === 'string' || typeof item.rawKey === 'number')
    ) {
      node.attr('data-row-key', String(item.rawKey));
    }
    return { ...item, node };
  });

  for (let i = next.length - 1; i >= 0; i -= 1) {
    const node = next[i].node;
    const beforeNode = i + 1 < next.length ? next[i + 1].node : null;
    const currentIndex = parent._children.indexOf(node);
    if (currentIndex === -1) {
      placeKeyedMember(parent, members.get(next[i].rawKey), beforeNode);
      continue;
    }

    if (!beforeNode) {
      continue;
    }

    const beforeIndex = parent._children.indexOf(beforeNode);
    if (beforeIndex !== -1 && currentIndex >= beforeIndex) {
      parent._children.splice(currentIndex, 1);
      const target = parent._children.indexOf(beforeNode);
      parent._children.splice(target === -1 ? parent._children.length : target, 0, node);
      parent._childrenDirty = true;
      if (parent._el && node._el) {
        const anchor = beforeNode._el?.parentNode === parent._el ? beforeNode._el : null;
        parent._el.insertBefore(node._el, anchor ?? resolveInsertAnchor(parent, beforeNode));
      }
    }
  }
}
```

ViewNode 方法（放在 `replaceChild` 之后）：

```js
  /**
   * keyed 子项绑定：source 是 ref/computed 句柄。
   * 同 key 且行引用未变时复用节点（build 不重跑）；行引用变化原位换新；
   * 顺序变化 insertBefore 保身份。keyFn 缺省时用行引用身份做 key。
   */
  keyed(source, keyOrBuild, maybeBuild = null) {
    const build = typeof maybeBuild === 'function' ? maybeBuild : keyOrBuild;
    const keyFn = typeof maybeBuild === 'function' ? keyOrBuild : null;

    if (!isSignal(source)) {
      throw new TypeError('keyed() requires a signal handle as its source');
    }
    if (typeof build !== 'function') {
      throw new TypeError('keyed() requires a build function');
    }

    assertRegionChildAllowed(this);
    const segment = { keyFn, build, members: new Map() };
    this._keyedSegments.push(segment);
    registerNodeBinding(this, 'keyed', null, () => source.value, (rows) => {
      syncKeyedSegment(this, segment, rows);
    });

    return this;
  }
```

注意：`keyed()` 登记的绑定读取走 `() => source.value`——登记发生在绑定自己的 `withCollect` 上下文内，嵌套进区域 builder 时**不会**把 source 记进区域依赖（`recordRead` 只记最内层收集器），这正是 Task 3 全局约束要求的隔离。

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/keyed-children.test.js src/core/keyed-child.test.js`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/keyed-children.test.js
git commit -m "feat(core): add keyed children binding"
```

---

### Task 6: `mounted()` 条件挂载（子声明 + 父收养，无显式父 API）

**Files:**

- Create: `src/core/node-mounted.test.js`
- Modify: `src/core/node.js`（构造器 `_childMountStates`/`_mountCondition`/`_isMounted`、ViewNode 新增 `mounted()` / `isMounted()` 与私有 `_adoptMountCondition()` / `_syncChildMounted()`、`_setupObject` 特判、ElementNode `toHTML()` 挂点、父节点 renderDom 追加循环挂点）

**Interfaces:**

- Consumes: Task 5 的 `resolveInsertAnchor`。
- Produces:
  - `ViewNode.prototype.mounted(condition: SignalHandle | (() => unknown)): this` —— 唯一公共声明入口：把条件（句柄或零参闭包）存为惰性 `_mountCondition`（不建绑定、不碰 DOM，setup 期节点尚未进父树）；入树时由父节点**私有收养**。已被收养后再次调用抛 `TypeError`。闭包形态构建期求值一次，之后由**父节点** `flush()` 重新求值（绑定 owner 是父节点）。
  - `ViewNode.prototype.isMounted(): boolean` —— 返回**自身挂载条件的最近提交状态**（父节点绑定 commit 单向镜像到子节点 `_isMounted`，默认 true）。「元素此刻是否在文档里」另用 `node._el?.isConnected`（受祖先挂载与渲染时机影响），两层真相文档必须分清。
  - 私有 `_adoptMountCondition(node, condition)`：由 `child()` / `addChild()` / `insertBefore()` 插入路径调用，在**父节点**登记绑定（kind: `'mount'`，key 为子节点）并镜像状态。**不提供公共父侧 API**——运行期对已入树节点补挂条件暂无入口（创建期声明解决，YAGNI），文档写明。
  - 子节点 ViewNode 树与控件状态跨显隐保留；SSR 条件假时父节点 `toHTML()` 跳过该子节点。**不引入 `_parent` 指针**——挂载拓扑知识单侧归父节点。
- [x] **Step 1: 写失败测试**

创建 `src/core/node-mounted.test.js`：

```js
import { describe, expect, it } from 'vitest';
import { div, input, ref, section } from '../index.js';

describe('mounted condition adoption', () => {
  it('omits server HTML and detached DOM when the condition is false', () => {
    const visible = ref(false);
    const box = section((node) => {
      node.div((panel) => {
        panel.mounted(visible);
        panel.attr('data-panel', 'true');
      });
    });

    expect(box.toHTML()).toBe('<section></section>');

    const element = box.renderDom();
    expect(element.querySelector('[data-panel]')).toBeNull();
    expect(box.children()[0]._el).not.toBeNull();
  });

  it('reattaches at its child slot and preserves input state', () => {
    const visible = ref(false);
    const box = section((node) => {
      node.div('before');
      node.div((panel) => {
        panel.mounted(visible);
        panel.input((field) => field.attr('name', 'keyword'));
      });
      node.div('after');
    });
    const element = box.renderDom();
    const panelNode = box.children()[1];

    visible.value = true;
    expect(element.textContent).toBe('beforeafter');

    const field = element.querySelector('input');
    field.value = 'yoya';
    visible.value = false;
    expect(element.querySelector('input')).toBeNull();

    visible.value = true;
    const restored = element.querySelector('input');
    expect(restored.value).toBe('yoya');
    expect(element.childNodes[1]).toBe(panelNode._el);
  });

  it('supports keyed insertion, setup object form, and isMounted', () => {
    const visible = ref(true);
    const host = div();
    host.addChild(
      'k',
      div((node) => {
        node.mounted(visible);
        node.attr('data-keyed', 'true');
      })
    );
    const lazy = div({ mounted: visible });
    host.child(lazy);
    const element = host.renderDom();

    expect(element.children).toHaveLength(2);
    expect(host.getChild('k').isMounted()).toBe(true);
    expect(lazy.isMounted()).toBe(true);

    visible.value = false;
    expect(element.children).toHaveLength(0);
    expect(host.getChild('k').isMounted()).toBe(false);
    expect(lazy.isMounted()).toBe(false);
    expect(lazy._el).not.toBeNull();
  });

  it('supports zero-argument closures refreshed by parent flush', () => {
    let shown = false;
    const host = div();
    const panel = div((node) => {
      node.mounted(() => shown);
      node.attr('data-closure', 'true');
    });
    host.child(panel);
    const element = host.renderDom();

    expect(panel.isMounted()).toBe(false);
    expect(element.querySelector('[data-closure]')).toBeNull();

    shown = true;
    host.flush();

    expect(panel.isMounted()).toBe(true);
    expect(element.querySelector('[data-closure]')).not.toBeNull();
  });

  it('rejects bad conditions and redeclaration after adoption', () => {
    const visible = ref(true);
    const host = div();
    const panel = div((node) => node.mounted(visible));
    host.child(panel);
    host.renderDom();

    expect(() => div().mounted(true)).toThrow(/signal handle or a zero-argument function/i);
    expect(() => div((node) => node.mounted('yes'))).toThrow(
      /signal handle or a zero-argument function/i
    );
    expect(() => panel.mounted(visible)).toThrow(/adopted/i);
  });

  it('adopts a mounted declaration on replaceChild replacements', () => {
    const visible = ref(true);
    const list = div();
    list.addChild('b', div('B-old'));
    list.renderDom();

    list.replaceChild(
      'b',
      div((node) => {
        node.mounted(visible);
        node.attr('data-new', 'true');
      })
    );

    visible.value = false;
    expect(list.children()[0]._el.parentNode).toBeNull();

    visible.value = true;
    expect(list.children()[0]._el.parentNode).toBe(list._el);
  });

  it('does not reattach during the clearChildren removal window', () => {
    const visible = ref(false);
    const host = div();
    const box = div((panel) => panel.mounted(visible));
    host.child(box);
    const element = host.renderDom();

    host.clearChildren();
    visible.value = true;

    expect(element.children).toHaveLength(0);
  });

  it('destroys safely from the detached state', () => {
    const visible = ref(false);
    const host = div();
    const box = div((panel) => panel.mounted(visible));
    host.child(box);
    host.renderDom();

    expect(() => host.destroy()).not.toThrow();
    expect(() => host.destroy()).not.toThrow();
  });
});
```

- [x] **Step 2: 确认失败**

Run: `npx vitest run src/core/node-mounted.test.js`
Expected: FAIL，`panel.mounted is not a function`。

- [x] **Step 3: 实现**

1. 构造器追加（`_keyedSegments` 旁）：

```js
this._childMountStates = new Map();
this._mountCondition = null;
this._mountAdopted = false;
this._isMounted = true;
```

2. ViewNode 公共方法（`keyed()` 之后）：

```js
  /**
   * 条件挂载声明：把条件（句柄或零参闭包）惰性存放在本节点上，
   * 入树时由父节点收养建绑定。已被收养后再次调用属于重复声明，直接抛错。
   */
  mounted(condition) {
    if (!isSignal(condition) && typeof condition !== 'function') {
      throw new TypeError('mounted() requires a signal handle or a zero-argument function');
    }
    if (this._mountAdopted) {
      throw new TypeError('mounted() condition was already adopted by its parent');
    }

    this._mountCondition = condition;
    return this;
  }

  /**
   * 自身挂载条件的最近提交状态（父节点单向镜像写入，默认 true）。
   * 元素此刻是否在文档里另查 _el?.isConnected——受祖先挂载与渲染时机影响。
   */
  isMounted() {
    return this._isMounted;
  }
```

3. ViewNode 私有方法（紧随其后）：

```js
  /** 插入路径专用：收养子节点的惰性挂载条件，在父节点登记绑定。 */
  _adoptMountCondition(node, condition) {
    node._mountAdopted = true;

    registerNodeBinding(this, 'mount', node, toBindingRead(condition), (next) => {
      const mounted = Boolean(next);
      this._childMountStates.set(node, mounted);
      node._isMounted = mounted; // 单向镜像：父写子读，isMounted() 无需父指针
      this._syncChildMounted(node, mounted);
    });
  }

  _syncChildMounted(node, mounted) {
    if (this._deleted || node._deleted || !this._el || !node._el) {
      return;
    }

    // membership 校验：clearChildren / 区域换子后的残留绑定安全 no-op，
    // 不需要 _parent 指针，也没有双向同步问题。
    if (!this._children.includes(node)) {
      return;
    }

    if (mounted) {
      if (node._el.parentNode !== this._el) {
        this._el.insertBefore(node._el, resolveInsertAnchor(this, node));
      }
      return;
    }

    if (node._el.parentNode === this._el) {
      this._el.removeChild(node._el);
    }
  }
```

4. `ElementNode._setupObject` 的方法分发之前追加特判（配置形态只存惰性条件，不建绑定）：

```js
if (key === 'mounted' && (isSignal(value) || typeof value === 'function')) {
  this._mountCondition = value;
  return;
}
```

5. `child()` / `addChild()` / `insertBefore()` / `insertAfter()` / `replaceChild()` 五处插入路径，在 `this._children.push(viewNode)`（或 splice）之后统一追加收养：

```js
if (viewNode._mountCondition) {
  const condition = viewNode._mountCondition;
  viewNode._mountCondition = null;
  this._adoptMountCondition(viewNode, condition);
}
```

6. SSR 挂点：ElementNode `toHTML()` 的子节点序列化循环跳过 `this._childMountStates.get(child) === false` 的子节点。

7. 父节点 renderDom 追加循环：子节点仍执行 `renderDom()`（创建元素、激活绑定），但当 `this._childMountStates.get(viewNode) === false` 时跳过 append。

8. `destroy()` 内追加整洁清理（非正确性依赖）：

```js
this._childMountStates.clear();
```

- [x] **Step 4: 转绿**

Run: `npx vitest run src/core/node-mounted.test.js src/core/keyed-children.test.js`
Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add src/core/node.js src/core/node-mounted.test.js
git commit -m "feat(core): add child-declared mounted condition adoption"
```

---

### Task 7: 类型、文档与全量校验

**Files:**

- Modify: `types/core.d.ts`（ViewNode 类，`bindDocumentEvent` 声明之后）
- Modify: `docs/component-authoring.zh-CN.md`、`docs/component-authoring.md`（§6 可重建区域清单追加条目）

**Interfaces:**

- Consumes: Task 1-4 的最终 API。

- [x] **Step 1: 类型声明**

在 `types/core.d.ts` ViewNode 类的 `bindDocumentEvent` 声明后追加：

```ts
  /** Inserts a keyed child before another keyed child; null beforeKey appends. */
  insertBefore(
    key: string | number,
    child: ViewNode | ComponentLike | string | number,
    beforeKey?: string | number | null
  ): this;

  /** Inserts a keyed child after another keyed child; null afterKey prepends. */
  insertAfter(
    key: string | number,
    child: ViewNode | ComponentLike | string | number,
    afterKey?: string | number | null
  ): this;

  /** Moves an existing keyed child before another keyed child; null beforeKey moves to end. */
  moveBefore(key: string | number, beforeKey?: string | number | null): this;

  /** Moves an existing keyed child after another keyed child; null afterKey moves to start. */
  moveAfter(key: string | number, afterKey?: string | number | null): this;

  /** Replaces the keyed child at the same slot with a fresh node; siblings stay untouched. */
  replaceChild(
    key: string | number,
    child: ViewNode | ComponentLike | string | number
  ): this;

  /**
   * Signal-driven keyed item binding. Rows whose key and reference are unchanged
   * keep their nodes; changed rows are rebuilt in place; ordering uses insertBefore.
   */
  keyed(
    source: SignalHandle,
    build: (row: unknown, index: number) => ViewNode | ComponentLike | string | number
  ): this;
  keyed(
    source: SignalHandle,
    keyFn: (row: unknown, index: number) => string | number,
    build: (row: unknown, index: number) => ViewNode | ComponentLike | string | number
  ): this;

  /**
   * Declares conditional attachment: stores the condition (signal handle or
   * zero-argument closure) inertly on this node; the parent adopts it at tree
   * entry. Calling after adoption throws. Closure refresh goes through the
   * parent's flush().
   */
  mounted(condition: SignalHandle | (() => unknown)): this;

  /** Latest committed state of this node's own mount condition (default true). */
  isMounted(): boolean;
```

- [x] **Step 2: 文档条目**

`docs/component-authoring.zh-CN.md` §6「契约与边界」清单追加：

```markdown
- **列表协调**：`node.keyed(rows, keyFn, build)` 用信号驱动子项——同 key 且行引用未变时复用节点，行引用变化原位换新，顺序变化保身份移动；行内字段用信号可在不重建的前提下原地刷值。自定义策略用 `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` 原语。
- **条件挂载**：`panel.mounted(cond)` 是唯一公共入口——条件接受 ref/computed 句柄或零参闭包，惰性存在子节点上，入树时父节点收养建绑定（闭包变化后用**父节点** `flush()` 重求值）。为假时子元素脱离文档但 ViewNode 与状态保留，为真时按子节点槽位回归；SSR 条件假输出空串。`node.isMounted()` 查询自身挂载条件的最近提交状态；「元素此刻是否在文档里」查 `node._el?.isConnected`。它与 `display` 显隐（看不见但在）、`rebuildable()`（销毁重建）构成三档：**不在但活着**。挂载绑定登记在父节点；`div({ mounted: cond })` 配置形态走同一条收养路径；运行期对已入树节点补挂条件暂无公共入口（创建期声明解决）。
```

`docs/component-authoring.md` 同位置追加英文镜像：

```markdown
- **List coordination**: `node.keyed(rows, keyFn, build)` drives items from a signal — rows whose key and reference are unchanged keep their nodes, changed rows rebuild in place, and reorders move nodes with identity preserved. Use the `insertBefore(key, child, beforeKey)` / `insertAfter(key, child, afterKey)` / `moveBefore(key, beforeKey)` / `moveAfter(key, afterKey)` / `replaceChild(key, child)` primitives for custom strategies.
- **Conditional attachment**: `panel.mounted(cond)` is the single public entry — the condition accepts a ref/computed handle or a zero-argument closure, rests inertly on the child, and the parent adopts it at tree entry (closure changes refresh via the **parent** `flush()`). False detaches the child element from the document while keeping the child ViewNode and its state alive; true reattaches it at its child slot, and SSR omits it while the condition is false. `node.isMounted()` reports the latest committed state of its own mount condition; "is the element in the document right now" is `node._el?.isConnected`. Together with `display` toggling (invisible but present) and `rebuildable()` (destroy and rebuild) it forms the third tier: absent but alive. The binding is registered on the parent; the `div({ mounted: cond })` config form shares the same adoption path, and there is intentionally no public API for attaching a condition to an already-inserted node (declare it at creation).
```

- [x] **Step 3: 全量校验**

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Expected: 全部通过（无关重型页面的 5s 超时按全局约束隔离复跑确认）。

- [x] **Step 4: 提交**

```bash
git add types/core.d.ts docs/component-authoring.md docs/component-authoring.zh-CN.md
git commit -m "docs(core): document keyed and mounted node APIs"
```

- [ ] **Step 5: 推送**

```bash
git push -u origin feat/keyed-mounted-children
```

---

## 计划外追加（2026-09-15）

计划内 Task 1-7 全部落地后，同一分支上继续补齐了两块内容：

- **子树错误边界**：`node.whenFailed(handler)` 与组件对象 `whenFailed` 成员（`ComponentNode`
  自动挂载）、devtools `error` 事件，测试见 `src/core/node-when-failed.test.js`；
  示例站新增独立「错误处理」页（报告模式 / 组件协议降级）。
- **文档与 skill 回填**：`docs/highlights` §5、`docs/component-authoring` §6、README 能力一览、
  `docs/beginner-feedback.zh-CN.md` 回填记录、示例站原生页 API 表，以及
  `skills/yoya-ui`（SKILL.md / references/state.md / references/core.md）。
- **API 更名**：`mounted()` → `mountable()`，同步 `types/core.d.ts`、测试文件名、
  示例站 API 表、docs、README / ROADMAP 与本机 skill 安装目录。
