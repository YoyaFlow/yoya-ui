# 状态：Signals（ref / computed）与可重建区域

## 最小用法

```js
import { computed, div, ref, vButton, vCard, vInput, vText } from '@yoyaflow/yoya-ui';

const items = ref([]);
const draft = ref('');
const left = computed(() => items.value.filter((item) => !item.done).length);

div((root) => {
  root.vInput({ model: undefined, placeholder: '新任务', value: draft });
  root.p((line) => line.child(vText(computed(() => `剩余 ${left.value} 项`))));
  root.div((list) => {
    list.rebuildable(); // 结构随数据变化
    items.value.forEach((item) => list.addChild(item.id, div(item.title)));
  });
  root.vButton('添加', (button) => {
    button.on('click', () => {
      items.value = [...items.value, { id: `t${items.value.length + 1}`, title: draft.value }];
      draft.value = '';
    });
  });
});
```

一句话模型：**值变化由绑定原地更新，结构变化由区域重建**。写入信号即更新，不需要手动 flush。

## ref / computed 语义

```js
const a = ref(0);

a.value; // 读（在绑定 / 区域求值里会登记依赖）
a.value = 1; // 写（值相同不通知）
a.peek(); // 不建立依赖地读
a.subscribe((value) => {}); // 底层订阅，返回退订函数，不自动跑首次
a.update((value) => value + 1);

const b = computed(() => a.value * 2); // 只读、惰性、带缓存，依赖变化时重算
```

- `computed` 只读，写它会抛错。
- **浅层语义**：只有整值替换触发更新。`items.value.push(x)` 不触发，要 `items.value = [...items.value, x]`。
- 依赖由 core 收集（不是引擎的追踪实现），所以换引擎不改变依赖与派生语义。

## 值位置：直接把句柄传进 DSL

| 位置       | 写法                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| 属性       | `ele.attr('data-count', count)`、`ele.attr({ 'aria-busy': busy })`      |
| 样式       | `ele.style('width', width)`、`ele.styles({ width })`                    |
| 文本       | `ele.child(vText(count))`、`card.vCardHeader(vText(computed(() => …)))` |
| 布尔类名   | `ele.toggleClass('is-active', active)`                                  |
| 组件 props | `vInput({ value: name, disabled: locked, placeholder: hint })`          |

- 传句柄即建立绑定：写入后只改属性 / 文本，元素与焦点不重建。
- 绑定在**构建期求值一次**（服务端据此输出 HTML），订阅在客户端 `renderDom()` 时激活、`destroy()` 与区域重跑时释放。
- 纯函数式动态值（零参闭包 `() => …`）仍可用，属过渡写法；新代码用信号。

## 写回：不做双向绑定

没有 `model`。写回用显式事件处理器，与 `vForm` 的收集路径互不影响：

```js
vInput({
  value: name, // 视图 ← 信号
  oninput: (event) => {
    name.value = event.target.value; // 信号 ← 视图
  }
});
```

- 同一节点同一事件是**单槽**：重复 `.on('input', fn)` 只保留最后一个，别把写回拆到多个 handler。
- 绑定提交时会跳过"值已相同"的写入，所以打字过程中不会把光标顶到末尾；中间若插入转换（`Number()` / trim），值不再相等，此时需要自行判断。
- 表单收集仍用 `vForm` + 控件的 `name()`。

## 可重建区域：结构随数据变化

```js
const rows = ref([]);
const busy = ref(false);

div((list) => {
  list.rebuildable(() => !busy.value); // 谓词：这次要不要花重建
  rows.value.forEach((row) => list.addChild(row.id, div(row.name)));
});
```

- 声明 `rebuildable()` **之后**读到的信号成为该区域的依赖；信号变化时按谓词门禁重建。
- 谓词只回答「这次要不要花重建」：为假时结构不动、只刷值，并记 `rebuildPending()`，可由 `rebuild()` 补一次。
- 约定：先 `rebuildable()` 再读数据（声明之前读到的信号不计入该区域依赖）。
- 区域重跑**不保留区域内 DOM 身份**（焦点、选区、内部滚动、第三方实例都会重建）；区域外的兄弟节点不受影响。要保住焦点就把那块留在区域外，或用值绑定。
- 每次重建会重捕依赖，所以条件分支切换后依赖集正确。
- 服务端只建一次（没有写入），重建只发生在客户端。

## 组件作者注意

自定义组件不要直接操作 `document`，走节点 DSL；需要文档级 / 窗口级监听用 `bindDocumentEvent` / `bindWindowEvent`。组件可暴露链式 API（`value(next)`、`disabled(next)`），但对外只暴露方法，不要让使用者直接持有内部信号。

## 引擎与替换

```js
import { installSignals } from 'yoya-ui';

installSignals(adapter); // 换成第三方实现（替换语义，不并存）
installSignals(null); // 回到内置引擎
```

- 引擎契约只有四个方法：`createSignal` / `read` / `write` / `subscribe`。依赖收集与 `computed` 由 core 负责，所以换引擎不改变依赖与派生语义。
- **signals 类库与 store 类库都能当引擎**：value 单元可以是一个极小的 store
  （`getState` / `setState` / `subscribe`）——现成适配器见 `yoya-ui/signals-preact`
  与 `yoya-ui/signals-zustand`，都接收第三方模块作为参数。
- **同一时刻只激活一个引擎**：两个引擎版本同页面会让依赖追踪各说各话（表现为该更新时不更新）。
- 业务代码只依赖 `yoya-ui` 的 `ref` / `computed`，不直接 import 引擎实现。
- 照着写新适配器时，看这两份范例即可：`signals/preact/index.js`（signals 类库）、
  `signals/zustand/index.js`（store 类库），示例站「Signals 状态管理」页直接展示原文；
  内置适配器在 `core/signals/engine.js`，可当最小骨架对照。
  两个容易踩的差异：引擎的 `subscribe` 通常会立即回调一次（契约要求吞掉首次）；
  监听器内部读值要用引擎的 `untracked` 包一层（store 类库通常不需要），否则重建期间的读取会把订阅自我放大。

## SSR 纪律

- 信号**建在页面工厂或组件内部**（每请求 / 每实例一份），不要放模块级——模块级信号会在并发请求间串数据。
- 初值必须确定性：不要用 `Date.now()` / `Math.random()` 影响输出，否则两端对不齐。
- 构建期只求值一次、不订阅；`effect` 服务 DOM 之外的副作用且服务端不执行，不要用它同步视图。
- 同一 `createPage(state)` 工厂两端复用；服务端序列化 `state`，客户端用它作信号初值。

## 常见错误

| 现象               | 原因                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| 写入后视图不动     | 信号建在模块级 / 写入发生在渲染之前未激活订阅；或区域里在 `rebuildable()` 之前读的数据 |
| 输入框光标跳到末尾 | 写回时值被转换过，绑定写入了不同的值                                                   |
| 列表重建后焦点丢失 | 该块在区域内；把输入框移出区域，或用值绑定                                             |
| 结构没随筛选变化   | 区域没声明 `rebuildable()`，或读的不是信号（`rows.value` 没读）                        |
| 并发请求串数据     | 信号放在了模块级                                                                       |
