# 06 — SSR 首屏链路与构建期 flush

**What to build:** 服务端构建同样执行「构建 → flush 绑定」，使 `toHTML()` 不丢绑定值；客户端 hydrate 产出与服务端一致的树；区域重跑只发生在客户端。

**Blocked by:** 01 — 区域声明与手动重跑, 04 — vStateNode 接入自动触发

**Status:** ready-for-agent

- [ ] 服务端 `toHTML()` / `renderToString()` 输出包含绑定值。
- [ ] 客户端 hydrate 后的节点树与服务端 HTML 一致（首屏确定性）。
- [ ] 区域重跑不在服务端触发；并发两请求互不污染（无模块级可变状态参与）。
