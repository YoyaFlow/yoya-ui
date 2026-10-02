# components/ —— 项目级 L6 业务块（按需）

项目作用域的业务片段（`local/<名字>`），**一文件一件**：`components/<名字>.json`
（`{ name, description, params, schema, source }` —— **文件里不写 `id`**，名字就是真相）。

- 多个 UI 共享的业务块放这里；
- 只服务某一个 UI 的片段留在那个 UI 的 `apps/<ui>/src/components/`；
- **UI 之间不许直接互相引用** —— 要共享走这一层，或 promote（沉淀成 kit / 组件库）。

落点口径（2026-09-30）：宿主**就写这一层**（一件一文件、可单独 blame）；老位置
`<项目>/state/business-components.json` 与运行时目录的 `business-components.json` 都**只读兼容**
（不静默搬家，已有片段照旧读得到）。空目录 = 还没有共享片段，不是"没写完"。
