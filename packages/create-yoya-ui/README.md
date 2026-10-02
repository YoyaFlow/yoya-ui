# create-yoya-ui

快速体验 [yoya-ui](https://github.com/yoyaflow/yoya-ui) 的脚手架。

## 安装

```bash
npm install -g create-yoya-ui
```

## 用法

```bash
create-yoya-ui my-app --template admin     # 不写 --template 时默认 basic
cd my-app
npm install
npm run dev
```

```bash
create-yoya-ui --list                      # 列出可用模板
```

## 模板内容

- `templates/basic`：最小 SPA 示例（页面壳 / 按钮事件 / 表单收集与校验 / 明暗模式）
- `templates/admin`：标准后台管理模板（logo/系统名、顶部导航、用户头像、左侧菜单、带标题内容区），内置数据概览看板与图表，以及成员 / 角色 / 权限 / 字典管理示例
- `templates/ssr`：SSR 模板（`renderPage` 整页渲染 + `hydrateOrMount` 客户端接入）
- `templates/genui-kits`：**GenUI kit 模板**（`components/<族>/component.json` + `impl.js` → `kit.json`
  清单 + 浏览器制品 `dist/yoya.kit.js`），用来开发能被 GenUI 宿主动态装载的自定义组件：
  - `npm run dev` 调试台（组件目录 + `examples/*.json` 实时渲染 + 写数据模型验证活值）
  - `npm run kit:generate` / `npm run kit:check`：由 `component.json` 生成并校验 `kit.json`（CI 门禁）
  - `npm run verify`：`kit:check` + `test` + `build` 全套
  - 开发指南见 [`docs/genui-kit.zh-CN.md`](../../docs/genui-kit.zh-CN.md)
- `templates/genui-project`：**GenUI 应用工程**（项目即目录：`resources/` 资产层 + `apps/<ui>/`
  一个 UI 一个可独立起的工程 + `data|cache|versions` 数据三件 + `.genui/` 账本；**`cwd` 即项目**）。
  这个目录就是 agent 的工作目录：
  - 页面声明在 `apps/<ui>/src/pages/*.genui.json`（真相）；取数逻辑在 `resources/queries/*.sql`
    （配 `.json` 写参数契约与默认值）；「有哪些源」在 `resources/sources.json`；数据在 `data/`
  - **地址与凭据不进项目**：本机写运行时目录（`~/.genui`），部署方提供 `hosts`
  - 起开发服务器要**进 UI 工程**：`cd apps/main && npm run dev`（根 `package.json` 只有 workspaces）

## 模板的本地联调

模板在仓库内（`packages/create-yoya-ui/templates/*`）也能直接跑：`vite` 配置会把
`@yoyaflow/yoya-ui` / `@yoyaflow/yoya-core` 的子入口指到 `packages/*/src`，改了源码当场生效；
模板被复制出去后这些路径不存在，自动回退到 npm 包解析。
