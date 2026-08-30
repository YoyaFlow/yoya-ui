# 04 — Hydration：收养服务端 DOM 并绑定事件

**What to build:** 浏览器端通过 hydration 收养服务端生成的 DOM（不重建元素），绑定 pending 事件，文本节点对照、属性按客户端树对齐；hydration 后点击/输入等交互立即可用，DOM 节点身份保持不变。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] 提供 hydrate 入口：目标容器 + 组件 + 初始状态。
- [ ] 已有元素被收养而非重建；事件在收养时绑定。
- [ ] 文本与属性按客户端树对齐，节点身份保持。
- [ ] 千行级 hydration 基准：1000 行完成时间可接受、无明显布局抖动（必要时给出事件委托/分批绑定优化路径）。
- [ ] 与 01 的产物联测：renderToString → hydrate → 交互可用。
