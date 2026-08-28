# 01 — replaceClassName 类替换 API 与测试

**What to build:** 开发者能通过链式 API 把元素或组件的预设类替换成自定义类（旧类不存在时可通过开关允许仅添加新类），替换结果实时反映到渲染出的 DOM，并且可被单元测试与示例页面验证。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 提供 replaceClassName(old, next, tolerate) 链式方法，替换后 DOM 类名即时同步。
- [ ] tolerate 默认 false：旧类不存在时不改动；传 true 时允许旧类缺失并直接添加新类。
- [ ] 支持 next 为空格分隔的多个类；old 与 next 相同时为无操作。
- [ ] 与现有 className 追加语义互不干扰，组合使用行为符合预期。
- [ ] 核心契约测试覆盖替换、tolerant、无操作、链式与挂载后同步。