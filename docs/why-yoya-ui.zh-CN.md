# 为什么是 yoya-ui：定位、理由与取舍

[README](../README.zh-CN.md) 给的是精简版；本文保留长文：这个库为什么存在、九点理由、背后的定位，
以及我们接受的取舍。

## 一、九点理由

| 亮点                       | 说明                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **面向长期维护**           | 构建于原生 Web 标准之上，API 稳定：只需维护一套代码，无需同时维护基于多种框架版本构建的项目，也不随框架大版本迁移重写。                                                                    |
| **接入方式自由**           | script 标签、npm ESM、Vite/webpack、SSR 与脚手架模板均可接入；能力按模块按需引入。                                                                                                         |
| **声明式直观且灵活**       | 普通 JS 声明式 DSL + setup 回调 + 父节点快捷方法，没有 JSX/SFC 模板层；视图结构直观，组合灵活。                                                                                            |
| **多场景适用、全栈统一**   | 同一套页面工厂与状态逻辑覆盖整站 SPA、服务端模板与 SSR/hydration，Web 界面开发逻辑全栈一致。                                                                                               |
| **原生 JS 适应性高**       | 没有虚拟 DOM 与框架运行时，产出真实 HTML/DOM/JS，原生 JS 适应性高；Web 标准向后兼容，开发出的 Web 软件资产不过时。                                                                         |
| **生命周期控制**           | 以 ViewNode 作为真实 DOM 的操作句柄，提供不输虚拟 DOM 的生命周期与状态管理能力；子树错误边界（`whenFailed()`）自带降级；超大规模列表（vScroll 自动虚拟滚动、只渲染可视窗口）也能流畅渲染。 |
| **原生生态继承**           | 操作基于浏览器原生标准的真实 DOM：第三方库接入只需一个薄组件（一条生命周期契约），官方适配器 `vEchart` / `vThree` 就是参照；绝大多数 JS 库都以 DOM 为接口，无需担心生态缺失。              |
| **可嵌入既有项目局部增强** | 通过 `bindTo()` 把任意局部交互嵌入 HTML、PHP、JSP、Vue、React 等既有页面，渐进增强，无需整体迁移。                                                                                         |
| **AI 编程亲和性好**        | 无框架上下文与构建魔法，AI 生成的声明式组件可直接运行；原型迭代与批量生成页面时返工率低。                                                                                                  |

## 二、定位：面向浏览器原生 Web 的声明式扩展，而不是封闭生态的框架

yoya-ui 是面向浏览器原生 Web 技术的声明式扩展，同时把真实 DOM 当作与整个 Web 生态的**互操作
边界**：视图由普通 JavaScript 函数描述并组合成 ViewNode 树，ViewNode 是操控真实 DOM 的**句柄**
——DOM 元素的创建、挂载（`bindTo`）、更新提交（`commit`）与销毁（`destroy`）等生命周期都通过它
统一管理。在此基础上，yoya-ui 提供大量常用组件开箱即用；任何能挂载到 DOM 节点上的第三方库也都
能按需接入——内置组件是起点，不是库的能力边界。

```text
你的应用：页面工厂与业务组件
  └─ yoya-ui：声明式组合、路由、i18n、主题、状态、
      生命周期（mount / update / destroy / SSR）
      └─ 真实 DOM 元素（div()、vCard()、vForm() 等）
          └─ 独立 JS 库的挂载点：
             ECharts · Quill · Handsontable · MapLibre · 你的库
```

它不是封闭生态的巨型框架，也不是"零组件"基础库：富文本、电子表格、地图、复杂可视化等专业领域
交给 Web 生态中更专业的库（Quill、Handsontable、MapLibre、ECharts……），以原生 API 直接嵌入，
接入只需要一个薄组件（官方适配器 `vEchart` / `vThree` 就是参照）；表单、表格、导航、反馈、看板等
高频能力则开箱即用。npm、Vite/webpack、TypeScript、CI/CD 与 SSR 等现代工程能力全部一等支持
——去掉的只是框架运行时，不是工程基础设施。

一句话：**yoya-ui 站在浏览器原生 Web 之上做声明式扩展，常用组件开箱即用、第三方生态按需接入
——不必被锁进某一个框架宇宙，也能拥有 Web 全生态。**

## 三、为什么是原生 Web：框架会过期，标准不会

**浏览器本身就是足够好的运行时。** HTML 与 CSS 生而声明式，DOM API 清晰且直接；yoya-ui 不在
原生链路之上再架一层虚拟 DOM、模板编译器或框架调度器。

**标准向后兼容，框架版本却会碎片化。** 多年前写的 `document.createElement` 今天依然能运行，
浏览器每前进一步（新 CSS、新 Web API），yoya-ui 项目都直接受益。这正是理由 1、5"长期维护不过时"
的底层原因：稳定 API 建立在 Web 标准之上，再由规格文档与测试套件锁定行为。

## 四、评估这个项目：看仓库，不看 Star 数

Star 数衡量的是关注度，不是正确性。在这个项目赢得社交信号之前，真正有用的是能在仓库里直接查证的
信号：

| 信号       | 如何验证                                                                               |
| ---------- | -------------------------------------------------------------------------------------- |
| 运行时依赖 | `package.json` 没有 `dependencies` 块                                                  |
| 测试套件   | `npm test`                                                                             |
| 类型声明   | `npm run typecheck`（类型声明 + 消费方类型测试）                                       |
| SSR 确定性 | `packages/yoya-ui/src/testing/integration/*.ssr.test.js`、[ssr.zh-CN.md](ssr.zh-CN.md) |
| 分发格式   | `npm run build` → `dist/`                                                              |
| 产物校验   | `npm run build && npm run verify:dist`                                                 |
| 契约文档   | [component-authoring.zh-CN.md](component-authoring.zh-CN.md)                           |
| 公开路线图 | [ROADMAP.zh-CN.md](../ROADMAP.zh-CN.md)                                                |

README 中的 CI 徽章由 GitHub Actions 工作流实时驱动。覆盖率由 coverage 任务度量（Vitest v8、LCOV）
并上传到 Codecov，上传获得授权后启用徽章；release 徽章直接读 npm 上已发布的版本，不会过期。

```bash
npm install
npm test              # 全量套件：DOM、state、i18n、router、权限、SSR/hydration
npm run typecheck     # 类型声明 + 消费方类型测试
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build && npm run verify:dist  # 产物：分类隔离、SSR 冒烟、体积预算、README 体积表
```

## 五、坦诚说明冷启动——而这正是早期采用者的红利

yoya-ui 今天的 Star 少，是因为它**年轻**，而不是因为它小或无人维护。我们愿意接受这个取舍，也不
打算用营销造势替代它：项目由规格驱动、测试锁定、持续交付，并且没有历史包袱需要拖着走。

早期采用者现在能得到什么：

- **稳定的概念核心。** 组件形态、生命周期与组合模型已由组件开发指南固化，而不是随版本漂移。
- **直接影响方向。** 在 API 表面还足够小、仍可引导的阶段，早期采用者有机会参与优先级塑造。

如果你正在评估这个项目，我们只提一个请求：请评估仓库里真实存在的东西——测试、规格文档、API 与
Web 标准的契合度——而不是 Star 图标旁边的数字。

## 相关文档

- [agents.zh-CN.md](agents.zh-CN.md)：AI 代码助手该如何阅读本仓库、如何生成代码。
- [highlights.zh-CN.md](highlights.zh-CN.md)：各能力的具体形态与可运行片段。
- [interop.zh-CN.md](interop.zh-CN.md)：第三方库接入范式（一个薄适配组件 + 一条生命周期契约）。
