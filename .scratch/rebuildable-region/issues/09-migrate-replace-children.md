# 09 — 批量迁移其余重建调用点

**What to build:** 按目录分批把剩余手写重建（约 129 处 `replaceChildren`）迁移到区域机制，或产出明确保留旧写法的清单。

**Blocked by:** 08 — 首个真实组件迁移

**Status:** ready-for-agent

- [x] 逐批迁移并在每批结束后保持测试全绿（批次 1 见下）。
- [x] 未迁移的调用点给出保留理由清单（见下）。

## 批次 1（已完成）

| 文件 | 迁移前 | 迁移后 |
| --- | --- | --- |
| `src/navigation/steps.js` | 3 处（指示符 / 标题 / 描述三个内容盒的 `replaceChildren`） | 三个盒子声明为区域，setter 改为 `rerun()` |
| `src/data-display/badge.js` | 2 处（文本盒、角标盒） | 两个盒子声明为区域，`_syncBadge()` 改为 `rerun()` |

验证：`steps.test.js`、`badge.test.js` 与组件公共测试共 103 条用例通过；全量 938 条用例通过。
本批为纯重构（无行为变更），因此安全网是既有测试，未新增用例。

统计：全库 `replaceChildren(` 出现次数从 129 降到 **120**（40 个文件，含 `shared.js` 的定义）。

## 保留理由清单（未迁移）

**A. 工具与基础设施（不应迁移）**

- `src/components/shared.js`：`replaceChildren` 自身的实现与导出（3 处）。

**B. 与声明式写入冲突（迁移会改变语义）**

- `vSteps.items()`（`src/navigation/steps.js`）：组件内容也可通过 DSL（`steps.vStep(...)`）声明，
  区域化后 `rerun()` 会按 `_items` 清空声明式子节点。
- `vBadge.content()` / `children()`（`src/data-display/badge.js`）：内容既能用 setter 写入，
  也能命令式追加，区域化会让两者互相覆盖。

**C. 需要行级身份与差量（等 keyed 复用，工单 10）**

- 列表/行容器类：`tree.js`(10)、`tree-ranger.js`(9)、`vscroll.js`(6)、`menu.js`(5)、
  `table.js`(4)、`tabs.js`(4)、`pagination.js`(4) 等。全量重跑会丢弃行级 DOM 身份，
  影响焦点、滚动位置与大列表性能；这些正是设计稿 v2 要解决的问题。

**D. 语义即「整体替换」（可保留）**

- `router.js`(6)：路由出口切换本来就是替换当前视图，区域化收益有限。
- 各组件中的清空型调用（`replaceChildren(node, [])`）：语义是"清空"，
  与区域"重建"不同，需要重建时用 `rerun()`，需要清空时保留原写法。

**E. 候选批次 2（slot 型，风险低）**

- `dialog.js`(2)、`progress.js`(2)、`float-button.js`(2)、`detail.js`(3)、
  `breadcrumb.js`(4)、`anchor.js`(3)、`code.js`(3)、`split-panel.js`(4) 等，
  形态与批次 1 的 vSteps / vBadge 同类（内容由字段驱动的 slot）。
