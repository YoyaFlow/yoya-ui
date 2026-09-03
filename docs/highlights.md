# yoya-ui 亮点细节

> 只收录「别的项目做起来相当麻烦、yoya-ui 里几乎一行/一个入口就搞定」的核心能力：i18n、权限、同源双模式 SSR、声明式 DSL、表单。

## 1. i18n：字符串即词典，切语言自动刷新

不带 i18n 库、不维护 key 文件。默认文案就是字符串，`.s(key, params?)` 把它变成响应式文本。

```js
import { div, createI18n } from '@yoyaflow/yoya-ui';

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': { greeting: '你好，{name}' },
    en: { greeting: 'Hello, {name}' }
  }
});

div((root) => {
  root.p('你好，{name}'.s('greeting', { name: 'Ada' }, locale));
}).bindTo('#app');

locale.setLanguage('en'); // 页面文本自动刷新
```

- `.s()` 返回 `I18nTextNode`，订阅 locale，`setLanguage()` 全页自动刷新；支持 dot path、`{param}` 插值、fallback 回退。
- 持久化开箱即用：传 `storageKey` 自动写 localStorage；传 `key` 时多实例共用一个 `yoya-ui:i18n` 记录。
- SSR 每请求隔离：入口传 `i18n` 实例或 `(state) => I18n` 工厂即可，`resolveLocale` 按 cookie > query > Accept-Language 取语言。

## 2. 权限控制：声明一个资源码，隐藏/只读/禁用全自动

不写 `v-if(v-permission)`、不手写 disabled。在节点上声明裸资源码，渲染管线自动判定。

```js
import { createAccess, installAccess, vForm, vInput, button } from '@yoyaflow/yoya-ui';

installAccess(createAccess({ permissions: ['system:member'] }));

vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name', value: 'Ada' })); // 无写权限 → 自动只读/禁用
  form.child(button('导出').access('system:export')); // 就近覆盖，按自己的资源码
}).bindTo('#app');
```

- 无读权限 → 不渲染（SSR 也不输出）；有读无写 → `disabled / readonly / aria-disabled`；有写 → 正常。
- 权限作用域自顶向下继承、就近覆盖；SPA 用 `installAccess`，SSR 用入口 `options.access` 每请求注入。

## 3. 同源双模式 SSR：一份代码，两端各几行

页面就是服务端与客户端共用的一份 `createPage(requestState)` 工厂。

```js
// page.js —— 两端共用
export function HomePage(state) {
  return div((root) => root.h1('首页'.s('home')));
}

// server：渲染完整 HTML 文档
import { renderPage } from '@yoyaflow/yoya-ui/ssr';
const html = renderPage({ page, head, body }, state, { messages });

// client：一行接入（有 SSR HTML 走 hydrate，为空走 mount）
import { hydrateOrMount } from '@yoyaflow/yoya-ui/ssr';
hydrateOrMount(HomePage, { messages });
```

- `renderToString` 输出 HTML + 安全序列化的初始状态；`#app` 有服务端 HTML 走 `hydrate()` 收养 DOM、只绑事件，为空走 `mount()`。
- 确定性内建：`withIdAllocator` 保证同输入产出相同 id、跨请求隔离；渲染后自动 `destroy()`；超大页面 `maxNodes` 超限自动回退客户端渲染。

## 4. 声明式 DSL：无 JSX、无虚拟 DOM、无构建

视图就是 JS 函数描述的真实 DOM；`setup` 回调 + 父节点快捷方法，让组合自然成「主谓结构」。

```js
import { div, vCard, vButton, toast } from '@yoyaflow/yoya-ui';

div((page) => {
  page.vCard((card) => {
    card.vCardHeader('服务详情');
    card.vCardBody((body) => body.p('运行中'));
    card.child(
      vButton('启动', (b) => b.variant('primary').on('click', () => toast.success('已启动')))
    );
  });
}).bindTo('#app');
```

- 同一份代码既可直接 `.bindTo()` 上浏览器，也可 `toHTML()` / SSR；`child()` 统一接受 ViewNode / 组件对象 / 字符串数字。
- `registerChildFactories` 把组件注册为父节点快捷方法（`card.vCardHeader`），第三方组件也能扩展 DSL。

## 5. 表单：一处收集，查看/编辑态内建

不手写 state、逐个读 input value。`vForm` 里放控件，`form.values()` 一次取全部字段；`vField` 自带 view / edit 两种模式。

```js
import { vButton, vCard, vForm, vInput, vText } from '@yoyaflow/yoya-ui';

const summary = vText('尚未提交');
const form = vForm((f) => {
  f.vField((field) => {
    field.label('服务名');
    field.control((editor) => editor.vInput({ name: 'serviceName', value: 'api-gateway' }));
  });
  f.vField((field) => {
    field.label('负责人');
    field.control((editor) => editor.vInput({ name: 'owner', value: 'SRE Team' }));
  });
});

vCard((card) => {
  card.vCardBody((body) => body.child(form));
  card.vCardFooter((footer) => {
    footer.vButton('提交', (b) =>
      b.on('click', () => summary.textContent(JSON.stringify(form.values())))
    );
  });
}).bindTo('#app');
```

- `form.values()` 一次性收集全部字段；`form.values(next)` 整体赋值即可重置。
- `vField` 切换 `field.mode('edit' | 'view')`（或 `field.edit()` / `field.view()`），资料页/详情页不用自造两套渲染。
- SSR 表单校验在工厂里执行一次，服务端把错误状态烘焙进 HTML，客户端用同一套规则继续校验。
