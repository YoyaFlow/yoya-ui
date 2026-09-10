# 状态：vStateNode 与函数值绑定

## 最小用法

```js
import { vStateNode, vText, vCard, vButton } from '@yoyaflow/yoya-ui';

const counter = vStateNode({
  state: () => ({ count: 0 }),
  render(state, api) {
    return vCard((card) => {
      card.vCardBody((body) => {
        body.output((out) => out.child(vText((s) => `当前：${s.count}`)));
      });
      card.vCardFooter((footer) => {
        footer.vButton('+1', (button) => {
          button.on('click', () => api.setState({ count: state.count + 1 }));
        });
      });
    });
  }
});
```

## 三种更新路径

`setState(patch)` 之后按以下顺序决定如何更新：

1. 提供 `update(state, api, changed)`：返回 `true` → 全量 rebuild；否则只 flush 函数值绑定；
2. 没有 `update` 但 render 里登记了函数值绑定（`vText((s) => ...)`、`attr('value', (s) => ...)`、`style(..., (s) => ...)`）→ 只求值写回，DOM 节点不变；
3. 都没有 → 全量 rebuild（销毁旧根并重新 render）。

## 节点级状态（state / setState / flushAll）

任意节点（原生元素、SVG、组件节点、自定义节点）都有 `registerStateAttrs` / `registerStateHandler` / `setState` / `getState`，库内组件的 `disabled()` / `open()` / `active()` 就是用它实现的：

```js
// 自带状态：对象是幂等种子（重跑只补缺省字段），(s) => value 读它
const box = div((ele) => {
  ele.state({ count: 0, open: false });
  ele.attr('data-count', (s) => String(s.count));
});

box.setState('open', true); // 单值
box.setState({ count: 2 }); // patch —— 同义，写完自动 flushAll()

// 需要 oldValue 或命令式副作用时，才注册处理器
box.registerStateAttrs('open');
box.registerStateHandler('open', (value, node) => {
  node.attr('data-open', value ? 'true' : null);
});
```

- 写入状态后**会自动 `flushAll()`**：区域按谓词重建、普通节点只刷绑定（结构仍然只有 `rebuild()` / 谓词能改）。`setState('key', value)` 与 `setState(patch)` 同义；**构建期（setup / 区域重跑）里的 setState 只写状态**，不触发刷新与重建。
- 与组件级 `component.setState(patch)` 同名不同物：后者合并对象 patch（或 `(state) => patch`），按 `update` / 函数值绑定决定刷值还是重建，并通知 `subscribe` 的监听者。
- 没有注册处理器的状态名会静默写入，不报错也不动 DOM，适合放节点内部标记。

## 节点级状态与区域重跑

区域 `rebuild()` 会重置该轮登记的 `registerStateHandler`（避免叠加），但**保留状态值**；重跑产出的新 DOM 不会自动补跑处理器，所以初始态要在 setup 里自己读回：

```js
ele.registerStateHandler('open', (value, node) => node.attr('data-open', value ? 'true' : null));
ele.attr('data-open', ele.getBooleanState('open') ? 'true' : null); // 重建后新 DOM 的初始态
```

## 保持交互状态

输入框的 `value`、按钮 `disabled`、文本内容都优先写成函数值绑定；这样状态变化只更新属性/文本，不会替换元素，输入焦点与滚动位置不丢。

```js
render(state, api) {
  return vInput({
    name: 'name',
    value: (s) => s.name,
    oninput: (e) => api.setState({ name: e.target.value })
  });
}
```

手动同步同一处文案要「替换」：持有 `vText()` 句柄用 `textContent(next)`；元素 `.text(content)` 等价 `child()`，**每次调用追加一个文本节点**，反复同步会不断堆叠。

## 多根与 keyed 子节点

- render 返回 `[ViewNode, ...]` 时作为多根 fragment 直接落实，不产生包装元素；
- `parent.addChild('row-1', node)` 显式登记 key；元素子节点自动镜像 `data-row-key`，便于 SSR 与 devtools 对账。

## 事件覆盖语义

同一节点对同一事件重复 `.on()` 只保留最新 handler（单槽），不会叠加触发。需要多订阅者时由业务自行组合分发，不要把多个 handler 绑到同一事件名。

## 可重建区域（rebuildable / rebuild）

一块内容需要「结构随数据变化」、又不值得单独包一个状态组件时，把它声明成区域：内容由该节点自己的 setup 产出，重跑就是清空子节点再重跑这份 setup。

```js
const data = { rows: [] };

const body = div((ele) => {
  ele.rebuildable(() => !isBusy); // 可选：时机谓词，为假时只刷值、不重建结构
  ele.scope(() => data); // 可选：带参值函数 (d) => … 的来源
  ele.attr('data-count', (d) => String(d.rows.length));
  data.rows.forEach((row) => ele.addChild(row.id, div(row.name)));
});

body.rebuild(); // 重建：清空子节点 → 重跑 setup → 落地 DOM
body.rebuild({ force: true }); // 越过谓词强制重建
body.flush(); // 只求值写回绑定：不重建、不过谓词、值没变不写 DOM
body.rebuildPending(); // 是否有被谓词推迟的重建
```

- **值用 `flush()`，结构用 `rebuild()`**：`flush()`（节点级；组件级是 `component.flush()`）只把已登记的绑定求值写回，不动结构、不触发谓词、幂等；`rebuild()` 清空子节点并重跑 setup，且会连带刷新本轮新登记的绑定。一次变化里既有增删又有值变化时，只调 `rebuild()`——别叠加 `flush()`。
- **区域节点先建一次**：内容由区域自己的 builder 产出，所以可以在 `render()` 之外创建并直接持有引用（`const list = ul((box) => { box.rebuildable(); … })` → `list.rebuild()`），不必在 render 里 `let region = null` 回填；区域外的状态行、工具节点同理。**但要在组件 / 页面工厂内部创建**（每实例、每请求一份），不放模块级；`rebuild()` / `flush()` 只在客户端交互期调用，SSR 首屏只做构建。
- 区域内不保留 DOM 身份（焦点、选区、内部滚动、第三方实例都会重建），区域外的兄弟节点不受影响；要保住焦点就把那块留在区域外，或用函数值绑定。
- 谓词只回答「这次要不要花重建」：为假时只写回函数值绑定并记 `rebuildPending()`，结构不动；数据条件要写进 setup，不要用谓词当内容开关。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域节点的子节点只能由 builder 产出：在 builder 之外对它 `child()` / `addChild()` 会直接报错。
- 不要在区域 setup 里放一次性副作用（第三方实例、请求、埋点）；状态处理器与 `bindDocumentEvent` / `bindWindowEvent` 会在重跑时由引擎重置，定时器用 `registerRegionCleanup(fn)` 登记。
- 数据来源三选一：**节点自带状态**（`state({...})`，`setState` 写完自动 `flushAll()`）、**`scope(getter)`**（数据在组件外，pull：改完要自己 `flush()` / `rebuild()`）、**零参闭包**（不需要声明，任意节点可用）；在 `vStateNode` 内还可以直接继承宿主状态。带参 `(d) => value` 必须来自前三者之一（按形参个数判断，`(s = {}) => …` 视为零参）。
- 触发：区域归属于最近的状态组件，`setState` 时自动按谓词处理；没有状态容器时由调用方 `rebuild()` 驱动，谓词为假之后可用 `rebuildPending()` 决定是否补一次重建。
- 嵌套：区域里可以再声明区域（父区域只刷值时，子区域仍会评估自己的谓词）；嵌套的状态组件自成边界，其内部区域由它自己管理。

## 绑定归属与作用域（scope）

绑定分两件事，不要混：

| 职责                                                                       | 谁需要       | 是否要声明                     |
| -------------------------------------------------------------------------- | ------------ | ------------------------------ |
| **归属**：谁持有绑定、首屏谁求值、`flush()` 谁遍历、`destroy()`/重跑谁释放 | 所有绑定     | 不要——节点本来就有 `_bindings` |
| **来源**：`getState()` 给 `(d) => …` 当参数                                | 只有带参绑定 | 要——`scope()` 或宿主继承       |

```js
// 零参闭包：任意节点可用，不需要声明，首屏构建期求值一次
const label = div((ele) => ele.attr('data-x', () => store.x));
store.x = 'next';
label.flush(); // 值没变不写 DOM

// 带参绑定：声明一次来源，覆盖整棵子树
const card = div((root) => {
  root.scope(() => store);
  root.div((head) => head.attr('data-title', (d) => d.title));
  root.div((body) => body.div((leaf) => leaf.attr('data-count', (d) => String(d.count))));
});
card.flush(); // 一次刷整棵子树
```

- 来源解析顺序：**节点自己声明的 `scope()` > 构建栈上最近声明的 `scope()` > 宿主继承 > 无**；不合并、不按 key 向上找。
- 带参绑定没有来源时在**构建期**报错（`parameterized value requires a data source`），避免求值期才炸 `Cannot read properties of undefined`；零参闭包不报。
- `scope()` 只影响**值**：结构变化仍然只由 `rebuildable()` 决定（节点级重建必须声明 `rebuildable()`，否则 `rebuild()` 抛错）。
- **在作用域内建，不要先建后挂**：绑定在登记那一刻捕获作用域，先建好的子树不会获得后来声明的来源。
- 自持绑定的节点被挂进组件树后，宿主 `setState` 不会驱动它（它的绑定不在宿主作用域里），要自己 `flush()`。
- 绑定函数必须是**纯函数**：只依赖来源数据（`scope()` / 宿主 state / 每请求数据），不读 `document` / `window` / `Date.now()` / `Math.random()`——它在服务端构建期会求值一次。
