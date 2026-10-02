# kit 开发规则（给 AI 助手看）

本目录是一个 **GenUI kit**：组件以 JSON 被模型使用，`kit.json` 是宿主装载入口。
改这个项目时按下面的顺序思考：

1. **元数据先写 `component.json`**（`summary` / `dataContract` / `whenToUse` / `notFor` / `props` /
   `pitfalls` / `category` / `scenes`），再动实现；`kit.json` 与 `indexes/` 是生成物，
   **永远不要手改**，改完跑 `npm run kit:generate`。
2. **组件只有一种形状**：`(props, place) => 节点`。props 全部来自 JSON；
   `place` 是内容落位回调（`children` 已渲染好）。不要在组件里读全局、读 DOM 结构或抓节点句柄。
3. **状态归 GenUI 数据模型**：联动写进 schema（`data` + `"@:/路径"`），组件只声明哪些 props 收活值
   （`props: { 名字: { live: true } }`）；组件内部不做归一化式 `String(...)` / `Boolean(...)`，
   那会把活值冻成快照。能用引用表达的更新，不要新加"命令"。
4. **包 yoya-ui 组件是常规操作**：直接 `import { vXxx } from '@yoyaflow/yoya-ui/ui'`，在工厂里调用，
   内容 / 文本通道用 `childrenProp` / `textProp` 声明；`@yoyaflow/*` 只能当 peer。
5. **每条改动都要能过门禁**：`npm run verify`（= `kit:check` + `test` + `build`）。
   新增组件必须同时加 `examples/*.json` 与 `component.json` 条目，否则清单与实现不同真。
6. **只写 JSON 能表达的能力**：函数进不了 props，别设计需要回调的 API。

完整指导：<https://github.com/yoyaflow/yoya-ui/blob/main/docs/genui-kit.zh-CN.md>。
