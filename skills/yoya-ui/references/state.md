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

## 节点级状态（registerStateHandler / setState）

任意节点（原生元素、SVG、组件节点、自定义节点）都有 `registerStateAttrs` / `registerStateHandler` / `setState` / `getState`，库内组件的 `disabled()` / `open()` / `active()` 就是用它实现的：

```js
const box = div((ele) => {
  ele.registerStateHandler('open', (value, node) => {
    node.attr('data-open', value ? 'true' : null);
  });
});

box.setState('open', true); // 只驱动本节点注册的处理器
```

- 它只做两件事：写状态值、按注册顺序同步调用处理器 `(value, node, oldValue)`；**不重渲染、不做 diff、不重新求值函数值绑定**——值要跟着变就写 `flush()` / `rebuild()`，或用宿主组件的 `setState` / `flush()`。
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
  ele.dataSource(() => data); // 可选：带参值函数的数据来源
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
- 数据来源三选一：**组件状态**（`vStateNode` 内自动继承，`setState` 自动驱动）、**`dataSource(getter)`**（数据在组件外，pull：改完要自己 `flush()` / `rebuild()`）、**零参闭包**（不需要声明）。带参 `(data) => value` 必须来自前两者之一（按形参个数判断，`(s = {}) => …` 视为零参）；节点级 `setState` 不参与绑定求值。
- 触发：区域归属于最近的状态组件，`setState` 时自动按谓词处理；没有状态容器时由调用方 `rebuild()` 驱动，谓词为假之后可用 `rebuildPending()` 决定是否补一次重建。
- 嵌套：区域里可以再声明区域（父区域只刷值时，子区域仍会评估自己的谓词）；嵌套的状态组件自成边界，其内部区域由它自己管理。
