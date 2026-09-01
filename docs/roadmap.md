# 路线图

以下为特性清单，按领域分组，状态为**待实现**或**不纳入（设计取舍）**。已发布能力见各文档（SSR 高层入口 `renderPage` / `hydrateOrMount` 已可用，作为本清单中 SSR 基建项的基础）。

## SSR 基建

| 特性 | 说明 | 状态 |
|---|---|---|
| create-yoya-ui SSR 模板 | 脚手架新增 SSR 项目模板：home-page.js + server.mjs + client.js 一键生成，内置 renderPage/hydrateOrMount 与每请求 i18n | 待实现 |
| 流式渲染 | 页面分块输出 HTML（`<head>` → 骨架 → 内容），缩短首字节时间 | 不纳入：与同步确定性的 SSR 形态冲突，目标场景（后台/内部系统）收益低，数据加载在渲染外完成，超大页已有 maxNodes 回退 |
| 局部 hydration | 同一页面多个独立局部各自渲染与 hydration（自定义 `stateId` / `target`），支持 htmx 式按需请求片段后换入绑定 | 待实现 |
| 框架适配器 | 官方提供 node:http / Hono / Fetch 的最小接入适配器与示例，复用 renderPage 契约，保持库零框架耦合 | 待实现 |

## 说明

- 特性按可独立交付的切片推进，每个切片含测试与演示；
- 不破坏既有 API：底层原语（`renderToString` / `hydrate` / `mount`）保持可用；
- 更多基建项（vite 插件、DevTools、公开组件规范、AI 生态）将陆续补充到本清单。
