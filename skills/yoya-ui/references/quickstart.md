# 快速开始与常用 API

## 快速搭建项目

```bash
npm create yoya-ui@latest my-app
cd my-app
npm install
npm run dev
```

模板包含：页面壳（vBody）、按钮与事件、表单收集校验、明暗主题切换，可直接运行。

## 导入入口

- `yoya-ui`：组件与全部能力（core、html、svg、layout、actions、navigation、feedback、form、data-display、async、i18n、theme、router、effects）
- `yoya-ui/core`：第三方组件标准（`ViewNode`、`HtmlElementNode`、`createElementFactory`、`registerChildFactories`、`vStateNode` 等，零第三方依赖）
- `yoya-ui/ssr`：`renderToString`、`hydrate`、`mount`、`resolveLocale`、`serializeState`

## 挂载方式

- `node.renderDom()`：创建/复用真实 DOM 元素，`appendChild` 到目标
- `node.bindTo('#app')`：挂载到选择器或元素
- `mount(component, target, state)`：客户端全量渲染（SSR 入口之一，也用于无 SSR 场景）
- `node.destroy()`：清理事件并移除 DOM，页面卸载时调用

## 常用组件速查

| 场景      | 组件                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 按钮      | `vButton(label, cb)`，variant：primary/secondary/danger，`disabled()`/`loading()`                                                                                                          |
| 卡片      | `vCard` + `vCardHeader`/`vCardBody`/`vCardFooter`                                                                                                                                          |
| 文本/状态 | `vText('文案')`：动态文本节点，`textContent()` 读写并原地更新，可放进任何子节点位置                                                                                                        |
| 布局      | `div`/`section`、`hstack`/`vstack`/`grid`/`container`/`spacer`、`vSplitPanel`                                                                                                              |
| 表单      | `vForm`、`vFormItem`、`vInput`、`vSelect`、`vCheckbox(es)`、`vRadio(s)`、`vTextarea`、`vSwitch`、`vRate`、`vSlider`、`vCascader`、`vTagsInput`、`vAutocomplete`、`vColorPicker`、`vUpload` |
| 数据展示  | `vTable`、`vTree`、`vBadge`、`vDetail`、`vAvatar`、`vProgress`、`vCarousel`                                                                                                                |
| C 端体验  | `vSkeleton`（骨架屏）、`vLazyImage`（懒加载）、`vTransition`（进出场）、`vMasonry`（瀑布流）、`vImagePreview`（灯箱）                                                                      |
| 反馈      | `vMessage`/`toast`、`vDialog`、`vTooltip`                                                                                                                                                  |
| 导航      | `vMenu`、`vTabs`、`vSteps`、`vNavbar`、`vBreadcrumb`、`vAnchor`                                                                                                                            |
| 权限控制  | `node.access('system:member')`：无读隐藏、无写禁用；`installAccess` / SSR 入口 `options.access` 注入                                                                                       |

每种组件的用途、最小示例与关键 API 详见 [components.md](components.md)。

## 事件

`.on(event, handler)` 绑定真实 DOM 事件，`destroy()` 自动清理。复合组件事件统一用回调参数写法（见 SKILL.md 铁律）；需要监听自定义组件派发的事件时同样用 `.on()`。

## 组件定义（可选，面向第三方组件库）

三种形态：薄工厂（函数返回 ViewNode）、对象组件（`{ render() }`）、类节点组件（`class extends HtmlElementNode` + 成对工厂）。详见 `docs/component-library-authoring.md`。

## 权限控制

组件只声明裸资源码 `node.access('system:member')`；用户持有 裸码 = 读+写、`r.` = 只读、`w.` = 读+写。SPA：`installAccess(createAccess({ permissions, roles }))` 一次；SSR：入口 `options.access` 注入。详见 access-control.md。
