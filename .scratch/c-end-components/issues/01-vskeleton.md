# 01 — vSkeleton 骨架屏

**What to build:** 提供骨架屏组件（形态 C 类节点 + `vSkeleton` 工厂，注册进 async 分类），支持段落、头像、区块等占位形态，行数、宽度与尺寸可配置；加载占位动画遵循系统 reduced-motion（`motion: auto|always`）；数据到达后可直接替换为真实内容；含演示页与源码面板。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `vSkeleton` 可创建段落 / 头像 / 区块占位，数量与尺寸可配置
- [ ] 组件样式内聚（不依赖演示环境额外样式），动画尊重 reduced-motion
- [ ] SSR 输出确定（不读 window / document）
- [ ] 演示页可运行、源码可复制，通过 demo-readability 检查
