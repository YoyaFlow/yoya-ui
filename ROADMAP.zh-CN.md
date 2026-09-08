# yoya-ui 路线图

> 当前版本：0.4.0（产物重构线）。本文档只描述对外能力规划，任务规格与实现细节
> 不在此展开。

## M1 · 产物重构收口并发布（0.4.0）

目标：把“共享 core 增量入口 + 自包含 full + UMD + router/SSR 入口”真正交付到
npm 与 CDN，消除双 core 与 `./ssr` 子路径残留。

- [x] 增量入口：core / ui / router / echart / three / devtools（共享 core chunk）
- [x] 自包含入口：`yoya.ui.full.js`、`yoya.router.full.js`、`yoya.ui-router.full.js`
- [x] UMD：`yoya.ui-router.umd.js`（`window.YoyaUI`）
- [x] exports 移除 `./ssr`，SSR 原语并入 `./router`
- [x] types、SSR 模板、README/docs/技能引用同步
- [x] 第三方扩展只提供增量入口，不产出自包含 full
- [ ] PR 合入 main 并通过 CI
- [x] `npm pack` 产物与清单核对
- [x] 发布 @yoyaflow/yoya-ui@0.4.0，随后发布 create-yoya-ui@0.4.1
- [x] CDN 冒烟：增量入口（core chunk 自动加载）、full、UMD、SSR 模板
- [ ] 启用 CI / 覆盖率徽章

## M2 · 工程化与按需体积（0.5.0）

- 分类子入口：form / data-display / actions / navigation / feedback / async…
- 打包器 tree-shaking 验证与体积预算门禁
- 子入口类型测试纳入 CI
- SSR + 官方组件的单 core 冒烟测试固化

## M3 · 开发者体验与错误定位

- [x] child() / 组件 render() 错误的父节点与值上下文提示
- dev-only 创建来源快照：错误直接携带 `文件:行`
- DevTools 视图树联动：错误节点高亮 / 跳转
- demo 规范自动化：render 必须返回 ViewNode 等规则静态/运行时校验

## M4 · SSR 与组件库一体化（0.6 / 0.7）

- layout 页面壳可独立按需引用，SSR 服务端不必整包引入 ui
- 官方组件 SSR 渲染矩阵与表单校验 SSR 基准
- admin / basic 模板提供 SSR 可选形态

## M5 · 生态与 1.0

- 文档英文化同步（feat/docs-en 分支推进）
- Codex skill 与 AI 生成指引同步新导出形态
- 1.0 API 冻结：组件形态、生命周期、入口边界作为稳定契约
