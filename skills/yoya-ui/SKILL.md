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
- **setup 回调参数语义化命名**：回调收到的节点按职责命名（如 `vFormItem` 用 `itemOfLabel` / `labelField`），避免与闭包外层业务数据同名遮蔽；节点方法名与业务字段同名（label/value/status）时，漏掉 `()` 会拿到函数对象
- **文本**：字符串、`vText()`、i18n 节点、`'文案'.s('key')` 四种写法自动归一
- **事件绑定铁律**：快捷方法返回父节点而非子元素，事件必须用回调参数：
  - 错误：`page.button('保存').on('click', fn)`（handler 挂到 page 容器）
  - 正确：`page.button('保存', (btn) => btn.on('click', fn))`
- **不直接操作 document**：组件代码（含事件回调）不直接 `document.createElement` / `addEventListener`；需要文档级监听（外部点击、拖拽、Esc、滚动）时用 `bindDocumentEvent`，`window` 级用 `bindWindowEvent`，注入样式用 `injectDocumentStyle`

## 文本与状态

动态文本用 `vText()` 创建：渲染为真实 Text 节点，`textContent()` 读写并原地更新，可放进任何接受子节点的位置；SSR 输出自动转义。

```js
import { div, vButton, vText } from '@yoyaflow/yoya-ui';

const message = vText('加载中…');

div((root) => {
  root.p(message);
  root.vButton('完成', (button) => {
    button.on('click', () => message.textContent('已完成'));
  });
}).bindTo('#app');
```

字符串、`vText()`、i18n 文本节点与 `'文案'.s('key')` 四种写法自动归一，混用不受影响；需要响应式语言切换时用 `.s()` 或 `locale.text()`。

## 表单

`vForm` + `vFormItem` 收集与校验；控件设 `name()` 后自动进 `form.values()`；`form.validate()` 校验必填与自定义规则。详见 references/forms.md。

## C 端体验组件

面向内容站、工具与展示类页面的开箱组件：`vSkeleton` 骨架屏、`vLazyImage` 图片懒加载、`vTransition` 进出场过渡（`motion: 'always'` 强制动画）、`vMasonry` 瀑布流、`vImagePreview` 图片灯箱；`vCarousel` 已支持触摸/鼠标滑动。每种组件的用途与关键 API 见 references/components.md。

## 主题与样式

组件自带内聚样式；颜色、间距、控件尺寸等用 `--yoya-*` CSS 变量，换肤只覆盖变量；明暗/密度由 `data-yoya-mode`/`data-yoya-density` 切换。详见 references/theming.md。

## SSR 与 i18n

`renderToString` 输出完整 HTML，`hydrate` 收养并绑定事件；页面用 `createPage(requestState)` 工厂，服务端与客户端复用同一份定义；i18n 每请求实例，`'文案'.s('key')` 自动按请求语言翻译。详见 references/ssr-i18n.md。

## 权限控制

组件只声明裸资源码 `node.access('system:member')`，读/写级别由用户持有决定：无读不渲染、无写只读/禁用；容器声明即整块作用域、就近覆盖。SPA 用 `installAccess(access)` 初始化一次，SSR 用入口 `options.access` 注入。详见 references/access-control.md。

## 参考文件（按需读取）

- [references/quickstart.md](references/quickstart.md)：安装导入、语法与挂载、常用组件 API 速查
- [references/components.md](references/components.md)：每种组件的用途、最小示例与关键 API
- [references/forms.md](references/forms.md)：vForm/vFormItem、收集校验、自定义控件
- [references/theming.md](references/theming.md)：主题 token、类名契约、样式定制
- [references/ssr-i18n.md](references/ssr-i18n.md)：SSR/hydrate、每请求 i18n、路由配合
- [references/access-control.md](references/access-control.md)：权限控制（read/write、scope、SPA/SSR 注入、admin 接线）
- [references/core.md](references/core.md)：基于 `yoya-ui/core` 开发第三方组件（形态、契约、打包）
- [references/modules.md](references/modules.md)：业务模块组织规则（feature 目录、api 分层、命令范式、共享组件、导航状态）

## 交付物说明

- npm 包发布内容只有 `dist/` 与 `types/`（见 `package.json` 的 `files` 字段），**不包含 `docs/`**；本 skill 已自包含，消费方无需仓库文档
- 权威 API 面以包内 `types/*.d.ts` 与 `dist/*.js` 为准；渲染示例见 `dist/examples/ssr-demo.html`
- 使用方需自行链接样式 `dist/yoya.ui.css`（组件皮肤契约，无运行时 CSS 注入）
