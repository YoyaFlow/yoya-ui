---
name: yoya-ui
description: 在项目中正确使用 yoya-ui UI 库时使用：声明式组件 DSL、页面组合、表单收集与校验、主题 token、SSR/hydrate、i18n；也适用于基于 yoya-ui/core 开发第三方组件。
---

# Yoya UI

yoya-ui 是服务端渲染优先、核心保持稳定的 Web 基础库：ViewNode 视图树 + 声明式 DSL，基于浏览器原生能力构建，提供 UI 组件仅为开箱即用、不代表库的能力边界。本 skill 教你在**使用方项目**中正确地用它拼页面、收集表单、定制主题、做 SSR 与 i18n。

## 快速开始

```js
import { div, vButton, vCard } from '@yoyaflow/yoya-ui';

const page = div((root) => {
  root.vCard((card) => {
    card.vCardHeader('标题');
    card.vCardBody((body) => {
      body.p('内容');
      body.vButton('保存', (btn) => btn.on('click', () => console.log('saved')));
    });
  });
});

document.querySelector('#app').appendChild(page.renderDom());
```

## 核心语法

- **v 前缀工厂是复合组件**：`vButton`、`vCard`、`vForm`、`vInput`、`vSlider` 等；**原生标签工厂保留原义**：`div()`、`button()`、`input()` 始终是原生元素
- **setup callback 风格**：`vCard((card) => { card.vCardBody(...) })`，父节点快捷方法（`page.vButton`、`card.vCardHeader`）随处可用
- **文本**：字符串、`vText()`、i18n 节点、`'文案'.s('key')` 四种写法自动归一
- **事件绑定铁律**：快捷方法返回父节点而非子元素，事件必须用回调参数：
  - 错误：`page.button('保存').on('click', fn)`（handler 挂到 page 容器）
  - 正确：`page.button('保存', (btn) => btn.on('click', fn))`

## 表单

`vForm` + `vFormItem` 收集与校验；控件设 `name()` 后自动进 `form.values()`；`form.validate()` 校验必填与自定义规则。详见 references/forms.md。

## C 端体验组件

面向内容站、工具与展示类页面的开箱组件：`vSkeleton` 骨架屏、`vLazyImage` 图片懒加载、`vTransition` 进出场过渡（`motion: 'always'` 强制动画）、`vMasonry` 瀑布流、`vImagePreview` 图片灯箱；`vCarousel` 已支持触摸/鼠标滑动。每种组件的用途与关键 API 见 references/components.md。

## 主题与样式

组件自带内聚样式；颜色、间距、控件尺寸等用 `--yoya-*` CSS 变量，换肤只覆盖变量；明暗/密度由 `data-yoya-mode`/`data-yoya-density` 切换。详见 references/theming.md。

## SSR 与 i18n

`renderToString` 输出完整 HTML，`hydrate` 收养并绑定事件；页面用 `createPage(requestState)` 工厂，服务端与客户端复用同一份定义；i18n 每请求实例，`'文案'.s('key')` 自动按请求语言翻译。详见 references/ssr-i18n.md。

## 参考文件（按需读取）

- [references/quickstart.md](references/quickstart.md)：安装导入、语法与挂载、常用组件 API 速查
- [references/components.md](references/components.md)：每种组件的用途、最小示例与关键 API
- [references/forms.md](references/forms.md)：vForm/vFormItem、收集校验、自定义控件
- [references/theming.md](references/theming.md)：主题 token、类名契约、样式定制
- [references/ssr-i18n.md](references/ssr-i18n.md)：SSR/hydrate、每请求 i18n、路由配合
- [references/core.md](references/core.md)：基于 `yoya-ui/core` 开发第三方组件（形态、契约、打包）
- [references/modules.md](references/modules.md)：业务模块组织规则（feature 目录、共享业务组件、状态工厂、页面编排）
- [references/di.md](references/di.md)：依赖注入推荐（工厂参数注入 + 作用域上下文，SSR 每请求隔离）

## 交付物说明

- npm 包发布内容只有 `dist/` 与 `types/`（见 `package.json` 的 `files` 字段），**不包含 `docs/`**；本 skill 已自包含，消费方无需仓库文档
- 权威 API 面以包内 `types/*.d.ts` 与 `dist/*.js` 为准；渲染示例见 `dist/examples/ssr-demo.html`
- 使用方需自行链接样式 `dist/yoya.ui.css`（组件皮肤契约，无运行时 CSS 注入）
