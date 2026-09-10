# DevTools（Beta）

## 导入

```js
import {
  enableDevtools,
  disableDevtools,
  subscribeDevtools,
  getDevtoolsSnapshot,
  getDevtoolsDom,
  getDevtoolsScope
} from '@yoyaflow/yoya-ui/devtools';
```

主入口与 `core` 不导出这些符号；devtools 只从独立子路径加载，默认关闭。

## 快速开始

```js
enableDevtools();

const stop = subscribeDevtools((event) => {
  console.log(event.seq, event.nodeLabel, event.type, event);
});

const tree = getDevtoolsSnapshot(pageRoot);
const el = getDevtoolsDom(tree.id); // 定位真实 DOM
const scope = getDevtoolsScope(tree.id); // access/Context/i18n 详情

stop();
disableDevtools();
```

## 事件契约

每个事件带 `seq`（单调）、`nodeId`（稳定）、`nodeLabel`（可读节点描述）：

| type             | 含义                     | 补充                              |
| ---------------- | ------------------------ | --------------------------------- |
| `commit`         | 元素首次渲染             | `kind: 'mount'`                   |
| `destroy`        | 节点销毁                 | —                                 |
| `attr` / `style` | 属性/class、行内样式变更 | `name`、`previous`、`next`        |
| `child`          | 子项增删/重排            | `added` / `removed` / `reordered` |
| `text`           | 文本变更                 | `from`、`to`                      |
| `state`          | vStateNode 状态变更      | `changed`、`state`、`handling`    |
| `region`         | 可重建区域的处理         | `action`、`trigger`               |

`handling`：`update`（update 回调）、`bindings`（函数值绑定写回）、`rebuild`、
`pending`（组件未挂载）。

`region` 事件说明被标记区域的这次处理：`action` 为 `rebuild`（重建了子树）或
`flush`（只写回绑定值、结构不变）；`trigger` 为 `manual`（手动 `rerun()`）或
`state`（状态变化自动触发）。用它回答「这块为什么重建 / 为什么只是刷值」。

## 快照与作用域

- 快照是纯数据：`kind`（element/text/component/view/root）、`id`、`tagName`、
  `attrs`、`text`、`children`；
- `getDevtoolsDom(id)`：按 id 取已渲染 DOM，销毁后返回 `null`；
- `getDevtoolsScope(id)`：节点声明/生效的 access、devtools 开启期间捕获的
  Context、翻译文本节点的 i18n key/language。

想看到 Context 作用域时，先 `enableDevtools()` 再构建页面节点。

## 参考弹窗

示例站 DevTools（Beta）页提供大弹窗参考实现：对象结构、操作日志、状态与作用域
三个标签页；「隐藏面板」只 `display:none`，不销毁状态，重开原样恢复。

## 边界

- 只在浏览器开发期使用；不要在 SSR/生产进程开启；
- 目前是 Beta：参考面板属于示例交付，尚未作为官方 `openDevtoolsPanel` API 发布，
  也不含时间旅行/持久化/浏览器扩展。
