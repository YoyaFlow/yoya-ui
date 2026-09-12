# demo-source-simplify 家族状态（2026-09-12 补记）

本目录 8 张票：01–06 的实现随各批次迁移落地，07（遗留演示体系统一）与 08（无白名单强制收口）
在 2026-09-12 收口（commit `e06bcd1`、`c173b94`）。

## 实现与检查

- 分层检查：`src/examples/demos/demo-layering.test.js`（页面壳组件不进演示源码，`ALLOWLIST` 为空）
- 可读性检查：`src/examples/demos/demo-readability.test.js`（行宽 ≤100、点式链 ≤3）
- 面板契约检查：`src/examples/demo-source-contract.test.js`（逐页渲染全部 91 个文档路由 /
  217 个源码面板：imports 自洽、行宽、点式链、演示函数行数预算）
- 面板生成：`src/examples/component-source.js`（统一 import 块、还原动态 import 写法）
- 统一渲染路径：13 个遗留页面迁到 `form-misc-docs.js` / `misc-docs.js`，
  删除 `form-legacy-docs.js` / `misc-legacy-docs.js` / `detail-sources.js` 与全部死导出

## 未完成项（已在 08 登记）

- 「单函数 ≤60 行」按 AGENTS.md 是建议而非编译检查：存量 38 个较长演示登记在
  `LONG_DEMO_BUDGET`（只减不增），要真正降到 60 行以内需要把这些场景拆成多个演示。

## 全局验证（2026-09-12）

- `npm test`：140 文件 / 1062 例全绿
- `npm run lint`、`format:check`、`typecheck`、`build`、`verify:dist` 全绿
