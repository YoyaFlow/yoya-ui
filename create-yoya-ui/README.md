# create-yoya-ui

快速搭建 [yoya-ui](https://github.com/yoyaflow/yoya-ui) 项目的脚手架。

## 用法

```bash
npx create-yoya-ui@latest my-app                 # basic 模板（SPA）
npx create-yoya-ui@latest my-app --template ssr  # SSR 模板
cd my-app
npm install
```

- **basic**：默认模板，`npm run dev` 启动 Vite 开发服务器
- **ssr**：服务端渲染模板，`npm run build && npm start`（renderPage 整页渲染 + hydrateOrMount 客户端接入）

## 模板内容

- `templates/basic`：页面壳、按钮事件、表单收集校验、主题切换
- `templates/ssr`：home-page.js（页面组件 + 词典）、server.mjs（node:http + renderPage）、client.js（hydrateOrMount）
