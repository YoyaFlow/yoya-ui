# yoya-ui DevTools

> 状态：已发布。devtools 默认关闭、不进入生产主入口；调试时从独立子路径
> 导入并显式开启。参考面板见示例站「开发指南 → DevTools」。

## 独立入口

```js
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  isDevtoolsEnabled,
  subscribeDevtools
} from '@yoyaflow/yoya-ui/devtools';
```

主入口（`@yoyaflow/yoya-ui`、`@yoyaflow/yoya-ui/core`）不导出这些符号，生产构建
不会因为引入 devtools 而膨胀；devtools 自身只增加默认关闭的运行时守卫。

## 快速开始

```js
enableDevtools();

const stop = subscribeDevtools((event) => {
  console.log(event.seq, event.type, event.nodeId);
});

const snapshot = getDevtoolsSnapshot(pageRoot);
const element = getDevtoolsDom(snapshot.id); // 定位真实 DOM

stop();
disableDevtools();
```

## 视图树快照

`getDevtoolsSnapshot(root)` 返回纯数据快照，可画成与页面一致的视图树：

- `kind`：`element` / `text` / `component` / `view` / `root`；
- `id`：稳定节点 id，同一节点多次快照不变；
- `tagName` / `attrs` / `text`：元素标签、属性（含镜像后的 `class`）与文本；
- `children`：递归子快照；多根 fragment 在组件边界下完整呈现。

`getDevtoolsDom(id)` 按 id 返回已渲染的真实 DOM（元素或文本节点），未渲染或已
销毁返回 `null`。

## 事件流

`subscribeDevtools(listener)` 返回取消订阅函数；监听器抛错不会打断渲染。
每个事件都带 `seq`（单调递增）与 `nodeId`：

| type      | 含义                  | 补充字段                        |
| --------- | --------------------- | ------------------------------- |
| `commit`  | 元素首次渲染          | `kind: 'mount'`                 |
| `destroy` | 节点销毁              | —                               |
| `attr`    | 属性/class 变更       | `name`、`previous`、`next`      |
| `style`   | 行内样式变更          | `name`、`previous`、`next`      |
| `child`   | 子项增删/重排         | `added`、`removed`、`reordered` |
| `text`    | 文本变更              | `from`、`to`                    |
| `state`   | `vStateNode` 状态变更 | `changed`、`state`、`handling`  |

`state` 事件说明变更经过的路径：`update`（update 回调处理）、`bindings`
（函数值绑定写回）、`rebuild`（重建视图根）或 `pending`（组件未挂载）。

## 作用域详情

`getDevtoolsScope(id)` 返回节点详情：

- `access`：节点声明的资源码，`permissionState` 为生效状态
  （`active` / `readonly` / `hidden`）；
- `context`：devtools 开启期间构建节点时可见的 Context 层；
- `i18n`：翻译文本节点的实例语言与 key。

未开启 devtools 时构建的节点不会捕获 Context，行为与内存不受影响。

## SSR 与生产注意事项

- devtools 只在浏览器开发期使用；`toHTML`/hydrate 输出与 devtools 无关，
  开启/关闭不影响 SSR 确定性。
- 不要在生产或服务端进程调用 `enableDevtools()`；生产代码只需按需从独立
  子路径导入并默认不开启。
- 节点 id 与事件只在 devtools 会话中产生，不写入 HTML、不跨请求共享。

## 边界

首轮不含时间旅行、跨会话持久化与 React DevTools 级 UI；这些能力以
「可订阅事件流 + 快照」为基础留给扩展与社区。
