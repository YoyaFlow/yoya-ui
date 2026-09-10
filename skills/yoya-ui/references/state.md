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

## 多根与 keyed 子节点

- render 返回 `[ViewNode, ...]` 时作为多根 fragment 直接落实，不产生包装元素；
- `parent.addChild('row-1', node)` 显式登记 key；元素子节点自动镜像 `data-row-key`，便于 SSR 与 devtools 对账。

## 事件覆盖语义

同一节点对同一事件重复 `.on()` 只保留最新 handler（单槽），不会叠加触发。需要多订阅者时由业务自行组合分发，不要把多个 handler 绑到同一事件名。

## 可重建区域（rebuildable / rerun）

一块内容需要「结构随数据变化」、又不值得单独包一个状态组件时，把它声明成区域：内容由该节点自己的 setup 产出，重跑就是清空子节点再重跑这份 setup。

```js
const data = { rows: [] };

const body = div((ele) => {
  ele.rebuildable(() => !isBusy); // 可选：时机谓词，为假时只刷值、不重建结构
  ele.dataSource(() => data); // 可选：带参值函数的数据来源
  ele.attr('data-count', (d) => String(d.rows.length));
  data.rows.forEach((row) => ele.addChild(row.id, div(row.name)));
});

body.rerun(); // 重建：清空子节点 → 重跑 setup → 落地 DOM
body.rerun({ force: true }); // 越过谓词强制重建
body.regionPending(); // 是否有被谓词推迟的重建
```

- 区域内不保留 DOM 身份（焦点、选区、内部滚动、第三方实例都会重建），区域外的兄弟节点不受影响；要保住焦点就把那块留在区域外，或用函数值绑定。
- 谓词只回答「这次要不要花重建」：为假时只写回函数值绑定并记 `regionPending()`，结构不动；数据条件要写进 setup，不要用谓词当内容开关。
- 声明顺序：先 `rebuildable()`，再写值函数与其它登记。
- 区域节点的子节点只能由 builder 产出：在 builder 之外对它 `child()` / `addChild()` 会直接报错。
- 不要在区域 setup 里放一次性副作用（第三方实例、请求、埋点）；状态处理器与 `bindDocumentEvent` / `bindWindowEvent` 会在重跑时由引擎重置，定时器用 `registerRegionCleanup(fn)` 登记。
- 数据来源显式：零参闭包从外部取值；带参 `(data) => value` 需要 `dataSource()`，在 `vStateNode` 内默认继承宿主状态（按形参个数判断，`(s = {}) => …` 视为零参）。
- 触发：区域归属于最近的状态组件，`setState` 时自动按谓词处理；没有状态容器时由调用方 `rerun()` 驱动，谓词为假之后可用 `regionPending()` 决定是否补一次重建。
- 嵌套：区域里可以再声明区域（父区域只刷值时，子区域仍会评估自己的谓词）；嵌套的状态组件自成边界，其内部区域由它自己管理。
