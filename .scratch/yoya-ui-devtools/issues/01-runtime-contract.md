# 01 — devtools 公开运行时契约

**What to build:** devtools 成为可通过独立子路径按需导入的正式运行时 API：`enableDevtools()` / `disableDevtools()` / `isDevtoolsEnabled()` / `subscribeDevtools(listener)` / `getDevtoolsSnapshot(root)` 均有类型声明与构建产物；默认关闭、生产主入口不含 devtools 面板与扩展逻辑；SSR 与既有渲染行为不变；使用者按文档启用后能收到 commit/destroy 生命周期事件。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 新增 `@yoyaflow/yoya-ui/devtools` 独立子路径（ES 构建产物 + `.d.ts`），主入口不导出 devtools 符号
- [ ] 默认关闭零开销：未开启时渲染路径不产生事件、无额外副作用
- [ ] `enableDevtools()` 后订阅方可收到 commit/destroy 事件；退订后不再收到；监听器异常不打断渲染
- [ ] SSR/既有行为不变：`toHTML`/hydrate 输出与 devtools 无关，devtools 模块不读 `document/window`
- [ ] 契约测试：开启/关闭/退订/无副作用，类型消费者测试可编译
