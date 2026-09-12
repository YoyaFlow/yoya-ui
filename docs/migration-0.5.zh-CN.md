# 从 0.4 迁移到 0.5：节点级状态与 vStateNode 移除

0.5 是破坏性版本：**节点级状态 API 与 `vStateNode` 全部移除**，状态统一改用内置
Signals（`ref` / `computed`）与由信号驱动的可重建区域。库内部组件与示例已在同一
版本线完成迁移，本页给出对外迁移对照。

## 对照表

| 0.4 写法                                                             | 0.5 写法                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `vStateNode({ state, render, update })`                              | 普通组件对象（返回 `{ render() }`）+ `ref` / `computed`                    |
| `node.state({ count: 0 })`                                           | `const count = ref(0)`（在组件 / 页面工厂内部创建）                        |
| `component.setState({ n: 1 })`                                       | `n.value = 1`                                                              |
| `component.setState((s) => ({ n: s.n + 1 }))`                        | `n.update((value) => value + 1)`                                           |
| `update()` 返回 `true` 触发全量重建                                  | `rebuildable(谓词?)` 区域 + 区域构建期读信号                               |
| `node.setState('open', true)` + `registerStateHandler('open', …)`    | `const open = ref(false)`，把句柄直接交给 `attr` / `style` / `toggleClass` |
| `node.getBooleanState('open')` / `getStringState` / `getNumberState` | 直接读句柄：`open.value`                                                   |
| `(s) => value` 带参值函数（依赖 `state()` / `scope()`）              | 传句柄，或零参闭包 `() => value`（需要时自己 `flush()`）                   |
| `component.flush()` 手动同步值                                       | 写入信号即写回；只有非信号数据源才需要 `flush()` / `flushAll()`            |

## 迁移步骤

1. **组件内部状态改成 `ref`**：把 `state({...})` 的字段逐个换成 `ref(初值)`，
   `setState` 的调用点改成 `handle.value = next`（或 `handle.update(fn)`）。
2. **值位置直接传句柄**：`attr` / `style` / `vText` / 组件 props 都接受句柄，
   写入后绑定原地更新；删掉原先手动同步属性、样式、文案的代码。
3. **结构变化声明区域**：需要「结构随数据变化」的块先 `rebuildable(谓词?)`，
   再在构建期读信号（约定：先声明、后读数据），写入该信号即按谓词重建子树。
4. **对外仍只暴露方法**：组件内部用 `ref` 持有状态，对外给 `value(next)` /
   `disabled(next)` 这类链式方法，不要把内部信号对象交给使用者。
5. **清理旧引用**：删除 `vStateNode`、`state()`、`setState()`、`getState()`、
   `getBooleanState()` / `getStringState()` / `getNumberState()`、
   `registerStateAttrs()` / `registerStateHandler()` 与 `scope()` 的调用与类型引用。

## 示例

迁移前：

```js
const Counter = vStateNode({
  state: () => ({ count: 0 }),
  render(state, component) {
    return div((box) => {
      box.span(`计数：${state.count}`);
      box.button('+1', (button) => {
        button.on('click', () => component.setState({ count: state.count + 1 }));
      });
    });
  }
});
```

迁移后：

```js
const Counter = {
  render() {
    const count = ref(0);
    return div((box) => {
      box.span((line) => line.child(vText(computed(() => `计数：${count.value}`))));
      box.button('+1', (button) => {
        button.on('click', () => {
          count.value += 1;
        });
      });
    });
  }
};
```

结构随数据变化的场景，把「读信号」放进区域：

```js
const items = ref([]);

const list = div((box) => {
  box.rebuildable(); // 区域内读到的信号成为依赖，写入即重建
  items.value.forEach((item) => box.addChild(item.id, div(item.name)));
});
```

## 其他变化

- **带参值函数移除**：`(s) => value` 只服务节点级状态，登记时直接抛错
  （`parameterized value is no longer supported ...`）；请改传句柄或零参闭包。
- **`scope()` 移除**：它的唯一用途是给带参值函数声明数据来源。
- **`renderPage` 不再输出客户端入口**：以前它会自动在 `</body>` 前插
  `<script type="module" src="/client.js">`（可用 `{ client }` 改路径）；现在
  不再注入任何客户端脚本——路径、放 head 还是 body、前面还要执行什么，都由你的工程决定。
  迁移：在 `page.head(...)` 里自己加 `head.link({ rel: 'modulepreload', href: '/assets/client.js' })`
  与 `head.script({ type: 'module', src: '/assets/client.js' })`（`type="module"` 自带
  defer，head 里这样写是安全的；不要用没有 `defer` 的普通 `<script src>`）。
  详见 [`ssr.zh-CN.md`](ssr.zh-CN.md) 第 2.1 节。
- **devtools 事件**：`state` 事件随 `vStateNode` 一起移除，改为 `signal-write`
  （`signalId` / `previous` / `next` / `dependents`）；`region` 事件的
  `trigger` 由 `state` 改为 `signal`；`deprecated` 事件位保留，但当前没有会触发
  它的 API。详见 [`devtools.zh-CN.md`](devtools.zh-CN.md)。
- **保留的能力**：`rebuildable()` / `rebuild()` / `flush()` / `flushAll()` /
  `rebuildPending()` 语义不变，其中 `flush()` / `flushAll()` 现在只服务
  非信号数据源（外部对象 + 零参闭包）。
