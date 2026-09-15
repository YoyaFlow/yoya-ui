# 状态：Signals（ref / computed）与可重建区域

## 最小用法

```js
import { computed, div, li, ref, ul, vButton, vInput, vText } from '@yoyaflow/yoya-ui';

const items = ref([]);
const draft = ref('');

div((root) => {
  root.vInput({ placeholder: '新任务', value: draft });
  root.p((line) => line.child(vText(computed(() => `共 ${items.value.length} 项`))));
  root.ul((list) => {
    // 列表按 key 对账：增删 / 排序保持节点身份，行内值绑定原地刷值
    list.keyed(
      items,
      (item) => item.id,
      (item) => li(item.title)
    );
  });
  root.vButton('添加', (button) => {
    button.on('click', () => {
      items.value = [...items.value, { id: `t${items.value.length + 1}`, title: draft.value }];
      draft.value = '';
    });
  });
});
```

一句话模型：**值变化由绑定原地更新，列表走 `keyed()` 对账，整块结构换新才用区域重建**。
写入信号即更新，不需要手动 flush。

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

| 位置       | 写法                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 属性       | `ele.attr('data-count', count)`、`ele.attr({ 'aria-busy': busy })`                                         |
| 样式       | `ele.style('width', width)`、`ele.styles({ width })`                                                       |
| 文本       | `ele.child(vText(count))`、`card.vCardHeader(vText(label))`（仅当 `label` 是 `computed` 派生值时才这样写） |
| 布尔类名   | `ele.toggleClass('is-active', active)`                                                                     |
| 组件 props | `vInput({ value: name, disabled: locked, placeholder: hint })`                                             |

- 传句柄即建立绑定：写入后只改属性 / 文本，元素与焦点不重建。
- 绑定在**构建期求值一次**（服务端据此输出 HTML），订阅在客户端 `renderDom()` 时激活、`destroy()` 与区域重跑时释放。
- 纯函数式动态值（零参闭包 `() => …`）仍可用，属过渡写法；新代码用信号。
- **别白包**：`attr('data-count', computed(() => count.value))`、`vText(computed(() => String(count.value)))` 都多了一层；值位置自己会读句柄，数字也会自己转成字符串。`computed` 只留给真派生（拼接 / 运算 / 分支 / 多信号组合）。
- **别漏句柄**：`vText(count.value)`、`attr('x', count.value)` 传的是**快照**，写完就不再更新；只有确实要一次性写入时才这么写。
- **文本位置三种等价写法**：`child(vText(handle))`、`child(handle)`、`ele.text(handle)` 都建立同一个绑定（HTML 元素与 SVG 文本宿主都支持）。区别只在语义：`.text()` 每次调用**追加**一个文本节点，适合构建期设置一次；要反复替换同一处文本，就留一个 `vText()` 句柄用 `textContent(next)`。
- **机械替换后要自查**：把旧写法（`state()` / `sync()` 之类）换成信号时，每个新加的 `computed` / `String` 都问一句「去掉它行为是否一样」——迁移最容易把旧代码的包装原样搬过来。

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

## 列表协调：keyed()

区域重建是整片替换；列表按 key 对账用 `keyed()`：

```js
const rows = ref([{ id: 1, title: '任务 1' }]);

ul((list) => {
  list.keyed(
    rows,
    (row) => row.id,
    (row) => li(row.title)
  );
});
```

- 对账规则：同 key 且**行引用未变**→ 复用节点（`build` 不重跑，行内用值绑定或组件方法原地更新）；同 key 行引用变化→ 原位换新；顺序变化→ `insertBefore` 移动，节点身份与 DOM 状态保留（焦点、滚动、第三方实例不重建）。
- 省略 `keyFn` 时用**行引用本身**做 key（行对象稳定时可用）；重复 key 直接抛错，不会静默覆盖。
- `keyed()` 只协调自己这一段：新成员落在本段末尾（本段之后第一个兄弟节点之前），其它兄弟节点（含其它 keyed 段）不参与对账。
- 行内字段变化优先走值绑定：`computed` 句柄放文本 / 属性位置即可原地刷值，不必重建行。
- 自定义策略（拖拽排序、局部替换）用五个原语：`insertBefore(key, child, beforeKey)`、`insertAfter(key, child, afterKey)`、`moveBefore(key, beforeKey)`、`moveAfter(key, afterKey)`、`replaceChild(key, child)`；配套 `addChild(key, child)` / `getChild(key)` / `removeChild(key)`，key 都会镜像成 `data-row-key`。
- 与区域的关系：`keyed()` 的信号读取走自己的绑定收集上下文，**不**记进外层区域依赖——行数据变化不会让外层区域整片重建。

## 条件挂载：mountable()

`display` 样式显隐是「看不见但在」，`rebuildable()` 是「销毁重建」，`mountable()` 是中间那档：**不在但活着**。

```js
const visible = ref(false);

div((box) => {
  box.div((panel) => {
    panel.mountable(visible); // 句柄或零参闭包 () => shown
    panel.input((field) => field.attr('name', 'keyword')); // 状态跨显隐保留
  });
});
```

- 条件为假：元素脱离文档（SSR 不输出该子树），ViewNode 与控件状态保留；为真：按子节点槽位归位，不是追加到末尾。
- 声明在子节点、绑定在父节点：`mountable()` 在 setup 期声明，入树时由父节点收养；零参闭包形态由**父节点** `flush()` 重新求值。
- 已被收养后再调用 `mountable()` 会抛错；运行期给已入树节点补挂条件没有公共入口——创建期声明。
- `node.isMounted()` 返回自身挂载条件的最近提交状态；「元素此刻是否在文档里」另查 `node._el?.isConnected`（受祖先挂载与渲染时机影响）。
- 配置形态等价：`div({ mountable: cond })`（父节点走同一条收养路径）。

## 子树错误边界：whenFailed()

```js
div((box) => {
  box.whenFailed((error, info) => span(`降级：${error.message}`)); // 返回节点 → 替换子树
  box.child(RiskyWidget());
});
```

- handler 收 `(error, info)`，`info.phase` ∈ `build` / `render` / `event` / `update`；返回节点则降级替换子树，返回空（null / undefined）只上报并保持现状。
- 组件对象可以写与 `render()` 同层的 `whenFailed(error, info)` 成员，`ComponentNode` 自动挂载——组件自带降级，调用方不必重复声明。
- 嵌套边界：内层接管即止步；handler 返回空则继续向外；handler 自身抛错交给外层。无边界时错误原样传播（fail fast）。
- 捕获永不静默：`console.error` 必发（含原始 error），devtools 开启时追加 `error` 事件（phase / source / boundary）。
- 区域更新失败仍先回滚保旧内容，再交给边界决定；降级替换是原子的（先构建成功再换子树）。

## 组件作者注意

自定义组件不要直接操作 `document`，走节点 DSL；需要文档级 / 窗口级监听用 `bindDocumentEvent` / `bindWindowEvent`。组件可暴露链式 API（`value(next)`、`disabled(next)`），但对外只暴露方法，不要让使用者直接持有内部信号。

## 引擎与替换

```js
import { installSignals } from '@yoyaflow/yoya-ui';

installSignals(adapter); // 换成第三方实现（替换语义，不并存）
installSignals(null); // 回到内置引擎
```

- 引擎契约只有四个方法：`createSignal` / `read` / `write` / `subscribe`。依赖收集与 `computed` 由 core 负责，所以换引擎不改变依赖与派生语义。
- **插件由使用者自己写**：库不自带某家状态库的适配器，只提供契约、模板与一致性用例。
  value 单元可以是一个极小的 store（`getState` / `setState` / `subscribe`），
  所以 signals 类库与 store 类库（zustand 之类）都一样接。模板与两份演示代码
  （`adapter-template.js` / `adapter-signals-example.js` / `adapter-zustand-example.js`）
  见示例站「Signals 状态管理」页；
  `core/signals/engine.js` 是最小可跑实现。
- **同一时刻只激活一个引擎**：两个引擎版本同页面会让依赖追踪各说各话（表现为该更新时不更新）。
- 业务代码只依赖 `yoya-ui` 的 `ref` / `computed`，不直接 import 引擎实现。
- 写插件时两个容易踩的差异：引擎的 `subscribe` 通常会立即回调一次（契约要求吞掉首次）；
  监听器内部读值要用引擎的 `untracked` 包一层（store 类库通常不需要），否则重建期间的读取会把订阅自我放大。
  通知期间的重订不用插件操心：core 只对变化的依赖退订重订。

## SSR 纪律

- 信号**建在页面工厂或组件内部**（每请求 / 每实例一份），不要放模块级——模块级信号会在并发请求间串数据。
- 初值必须确定性：不要用 `Date.now()` / `Math.random()` 影响输出，否则两端对不齐。
- 构建期只求值一次、不订阅；`effect` 服务 DOM 之外的副作用且服务端不执行，不要用它同步视图。
- 同一 `createPage(state)` 工厂两端复用；服务端序列化 `state`，客户端用它作信号初值。

## 常见错误

| 现象                   | 原因                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 写入后视图不动         | 信号建在模块级 / 写入发生在渲染之前未激活订阅；或区域里在 `rebuildable()` 之前读的数据                           |
| 输入框光标跳到末尾     | 写回时值被转换过，绑定写入了不同的值                                                                             |
| 列表重建后焦点丢失     | 该块在区域内；把输入框移出区域，或用值绑定                                                                       |
| 列表重排后行内输入失焦 | 行没走 `keyed()`，而是区域整片重建；改用 `keyed()` 并在行内用值绑定                                              |
| 显隐切换后控件状态丢了 | 用了 `rebuildable()` 重建而不是 `mountable()`：条件挂载才是「不在但活着」                                        |
| 结构没随筛选变化       | 区域没声明 `rebuildable()`，或读的不是信号（`rows.value` 没读）                                                  |
| 并发请求串数据         | 信号放在了模块级                                                                                                 |
| 值不更新（快照）       | 值位置传了 `x.value` / `String(x.value)` 而不是句柄本身                                                          |
| 多一层无用的包装       | 纯占位写成 `computed(() => x.value)` / `computed(() => String(x.value))`：值位置直接接句柄，数字位置不用转字符串 |
