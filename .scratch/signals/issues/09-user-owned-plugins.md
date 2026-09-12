# 09 — 插件由使用者自己写（设计修正）

**Status:** done（2026-09-12 收口：preact / zustand 子路径与包内适配器已全部移出，
库只保留契约、安装入口与一致性用例；`@preact/signals-core` / `zustand` 仅作为示例站
「使用者自己写适配器」的 devDependency 保留，commit `73a765b`、`5fbe5f6`、`8c19bc1`）

**背景**：票 05 落地了 `yoya-ui/signals-preact`（把 Preact Signals 适配成引擎）。
后续一度又加了 `yoya-ui/signals-zustand`，被指「把某家库的适配放进核心库，
用户没法接入别的库」。

**定下的原则**

- 库只提供三样东西：**引擎契约**（`createSignal` / `read` / `write` / `subscribe`）、
  **安装入口**（`installSignals(adapter)` / `installSignals(null)`）、
  **一致性用例**（`src/core/signals/conformance.js`，供适配器作者自测）。
- 具体状态库的适配器由**使用者自己写**，不进主包、不作为子路径发布。
- 示例站只展示**插件模板**：`src/examples/adapter-template.js`（用 `?raw` 取原文，
  模板里写清四个必需方法、两个常见坑、装法）。

**本轮改动**

- `73a765b`：删除 `signals-zustand` 子路径、类型、构建入口、exports 与
  `zustand` devDependency；示例页由「两份真实适配器」改为「一份插件模板」。
- `feef9aa`（保留）：core 的差量重订修复——绑定 / computed / 区域订阅只对变化的
  依赖退订重订。store 形态引擎（`listeners.forEach` 通知）在回调里整体重订会自激，
  这是让「用户自己写的 store 类插件」能跑起来的前提。
- 修复的回归守卫放在 `src/core/signals/conformance.test.js`：测试内自带一个
  store 形态适配器（不依赖任何第三方库），跑一致性用例 + 绑定/区域端到端。

**已确认并执行（2026-09-12）**

- `yoya-ui/signals-preact` 属同一类问题（包内置了某家库的适配器），已一并移出：
  删除 `src/signals/preact/`、`src/yoya.signals-preact.js`、`types/yoya.signals-preact.d.ts`、
  `exports` 与 `@preact/signals-core` devDependency，并同步 README / 技能 / 三方声明。
  票 05 的「preact 插件」交付物因此作废，改动记录在本票。
- 移出后包内的「范例」只剩两处，都不是某家库的适配器：
  `core/signals/engine.js`（内置引擎适配器，最小可跑实现）与
  `src/examples/adapter-template.js`（示例站模板）。
- 顺带发现并修掉：`types/core.d.ts` 的 `SignalsAdapter` 把 `peek` / `collect`
  声明成必需，与运行时契约（四个方法）不一致；`collect` 本来就属于 core。
