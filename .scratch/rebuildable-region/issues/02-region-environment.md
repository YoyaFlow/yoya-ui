# 02 — 重跑的环境自持（access / context / i18n）

**What to build:** 区域在构建期捕获权限上下文、context 快照与 i18n 快捷方式实例，重跑时原样恢复，使权限态、`currentContext()` 与 `'文案'.s(key)` 与首次构建一致。

**Blocked by:** 01 — 区域声明与手动重跑

**Status:** ready-for-agent

- [x] 重跑后权限态与首次构建一致：`withAccess` 作用域内构建的区域重跑后仍按权限隐藏 / 只读。
- [x] 重跑后 `currentContext(key)` 仍能读到构建期的 provider 值。
- [x] 重跑后 `'文案'.s(key)` 使用构建期记录的 i18n 实例，不回落默认实例（需补 `stringShortcutI18n` 的内部 getter）。
- [x] 作用域退出后再重跑也不丢失上述环境。
