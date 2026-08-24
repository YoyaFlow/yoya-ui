# Yoya UI

Yoya UI is a small vanilla JavaScript UI foundation library built with Vite. It is meant for backend and full-stack developers who want enough structure to build web UI screens without adopting a large frontend framework.

## What Is Included

- Vite 8 library-mode build with ES module and UMD outputs.
- Vitest + jsdom tests for the core ViewNode contract.
- A browser-native HTML DSL core:
  - `ViewNode` for lifecycle, child nodes, events, and state.
  - `ElementNode` for real DOM elements.
  - `HtmlElementNode` for HTML-only child factory extensions.
  - `SvgElementNode` for SVG namespace elements.
  - `VTextNode` / `ViewTextNode` and `vText` for internal text nodes.
  - `I18n` and `I18nTextNode` for language-aware text that updates without rebuilding the view tree.
  - Full conforming HTML element factories from the WHATWG HTML standard.
  - Namespace-aware `svg()` tag entry with SVG-only child element extensions.
  - Layout factories such as `flex`, `grid`, `stack`, `hstack`, `vstack`, `center`, `container`, `spacer`, and `divider`.
  - A compact hash `Router` in `router.js` for route matching and ViewNode rendering.
  - Reserved or conflicting names use explicit aliases: `varTag()` creates `<var>`, and parent nodes use `styleTag()` to create `<style>` without replacing `.style()`.

## Project Documents

- [yoya-basic core summary](docs/yoya-basic-core-summary.md)
- [component development spec](docs/component-development-spec.md)

## Requirements

- Node.js `>=20.19.0`
- npm `>=10`

## Scripts

```bash
npm install
npm test
npm run build
npm run examples:html
npm run examples:i18n
npm run examples:layout
npm run examples:svg
npm run examples:router
npm run examples:admin
```

## Examples

- [Compound components](src/examples/Index.html#/components)

## Library Build

Build distributable files:

```bash
npm run build
```

The build outputs:

- `dist/yoya.ui.js`
- `dist/yoya-ui.umd.js`
- `dist/yoya.base.js`
- `dist/yoya.form.js`
- `dist/yoya.navigation.js`
- `dist/yoya.feedback.js`
- `dist/yoya.data.js`
- `dist/yoya.async.js`
- `dist/yoya.router.js`
- `dist/examples/Index.html` 和 `dist/examples/assets/`

按模块引入：

```js
import { div } from 'yoya-ui/base';
import { vForm } from 'yoya-ui/form';
import { vTree } from 'yoya-ui/data';
```

## Usage

下面是一个可以直接保存为 `dashboard.js` 的完整小模块。页面只需要准备 `<div id="app"></div>`，再用模块脚本加载它即可。

```js
import { section, vText } from 'yoya-ui';

export function DashboardExample() {
  const previewText = vText('预览：未填写');
  const statusText = vText('状态：等待保存');
  let nameInput = null;

  return {
    render() {
      return section((page) => {
        page.id('dashboard').className('surface');
        page.h1('Dashboard');
        page.p('一个带表单状态和事件处理的 ViewNode 页面模块。');

        page.form((form) => {
          form.label((label) => {
            label.attr('for', 'dashboard-name');
            label.text('名称');
          });
          form.input((input) => {
            nameInput = input;
            input.id('dashboard-name');
            input.attr('type', 'text').attr('placeholder', '输入名称');
            input.on('input', (event) => {
              const value = event.target.value.trim();
              previewText.textContent(`预览：${value || '未填写'}`);
            });
          });
          form.output((output) => {
            output.id('dashboard-preview');
            output.child(previewText);
          });
          form.button((button) => {
            button.attr('type', 'button');
            button.text('保存');
            button.on('click', () => {
              const value = nameInput.renderDom().value.trim() || '未填写';
              statusText.textContent(`状态：已保存 ${value}`);
            });
          });
        });

        page.p((status) => {
          status.id('dashboard-status');
          status.child(statusText);
        });
      });
    }
  };
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  section((root) => root.child(DashboardExample())).bindTo('#app');
}
```

更完整的表单、布局、路由、SVG 和语言切换模块见下面各专题 README；它们都遵循同一个可复制的函数入口约定。

### 函数组件

自定义组件统一使用“参数函数 → 带 `render()` 的对象 → ViewNode”的结构：

```js
import { section, span } from 'yoya-ui';

function StatusBadge({ label }) {
  return {
    render() {
      return span(label).className('status-badge');
    }
  };
}

section((page) => {
  page.child(StatusBadge({ label: 'Ready' }));
}).bindTo('#app');
```

`child` 会延迟调用并缓存 `render()` 返回的 `ViewNode`。组件参数保留在闭包中，组件对象无需继承 `ViewNode`；普通 setup 回调和现有 `v*` 工厂行为不变。组件还可以在 `render()` 之外公开命令：

```js
import { div, vText } from 'yoya-ui';

function StatusPanel() {
  const message = vText('Waiting');
  return {
    setStatus(value) {
      message.textContent(value);
    },
    render() {
      return div((panel) => panel.child(message));
    }
  };
}

const panel = StatusPanel();
page.child(panel);
panel.setStatus('Ready');
```

组件演示和可复制源码必须保留完整的 `{ render() { ... } }` 封装，不使用直接返回 `ViewNode` 或裸 `() => ViewNode` Factory 的写法。

## HTML Element Coverage

`src/html/index.js` covers the conforming HTML element set. Obsolete HTML elements, MathML, and custom elements are intentionally left out of this module because they need separate compatibility or namespace handling. SVG is provided separately by `src/svg/index.js`.

Most factories keep the same name as the tag:

```js
import { article, dialog, search, video } from 'yoya-ui';
```

Special cases:

- `varTag('x')` renders `<var>x</var>`.
- `style('body { color: black; }')` creates a top-level `<style>` node.
- `page.styleTag('body { color: black; }')` creates a child `<style>` node, while `page.style('display', 'grid')` remains the CSS style setter.

## SVG Elements

`svg()` creates a `SvgElementNode` with the SVG namespace. SVG child elements are intentionally scoped to the SVG node callback, so `circle()`、`path()`、`text()` and similar methods are only available inside `svg((icon) => { ... })`.

```js
import { svg } from 'yoya-ui';

svg((icon) => {
  icon.attr({ viewBox: '0 0 24 24', role: 'img' });
  icon.title('服务状态');
  icon.circle({ cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor' });
  icon.path({ d: 'M8 12l2.5 2.5L16 9', stroke: 'currentColor', 'stroke-width': 2 });
  icon.text((label) => {
    label.attr({ x: 12, y: 22, 'text-anchor': 'middle' });
    label.text('OK');
  });
}).bindTo('#app');
```

SVG child method names use their original tag names, including `a()`、`script()`、`style()`、`switch()`、`text()` and `title()`.

Name isolation rules:

- HTML child factories are registered on `HtmlElementNode`; SVG child factories are registered on `SvgElementNode`.
- `icon.text('OK')` creates `<text>OK</text>`. Inside `<text>`、`<tspan>`、`<title>` and similar text-bearing SVG nodes, `label.text('OK')` appends text content.
- `icon.style('.status { fill: currentColor; }')` creates SVG `<style>`. `node.style('fill', 'red')` and `node.styles({ fill: 'red' })` still set CSS styles.

By design, SVG child tags are not public top-level factories and are not added to ordinary HTML parent nodes:

```js
div((page) => {
  page.svg((icon) => {
    icon.circle({ cx: 12, cy: 12, r: 9 });
  });

  // page.circle(...) is not part of the HTML DSL.
});
```

Browser demo:

```bash
npm run examples:svg
```

Then open `src/examples/Index.html#/components`.

## Layout Components

Layout factories create `ElementNode` instances with stable inline styles and parent shortcut methods:

```js
import { container, div } from 'yoya-ui';

container((page) => {
  page.vstack((body) => {
    body.hstack((row) => {
      row.span('Name');
      row.spacer();
      row.strong('Ada');
    });
    body.grid({
      columns: 3,
      gap: '12px',
      children: [div('A'), div('B'), div('C')]
    });
  });
}).bindTo('#app');
```

Supported first-batch layout factories:

- `flex({ direction, gap, align, justify, wrap })`
- `stack({ gap })` and `vstack({ gap })`
- `hstack({ gap, align, justify })`
- `grid({ columns, rows, gap, areas, autoFlow })`
- `center()`
- `container({ maxWidth, paddingInline })`
- `spacer({ size })`
- `divider({ orientation })`

Browser demo:

```bash
npm run examples:layout
```

Then open `src/examples/Index.html#/components`.

## Compound Components

Complex UI components use a `v` prefix, so they stay distinct from native HTML factories:

```js
import { div, toast, vButton, vCard } from 'yoya-ui';

div((page) => {
  page.vCard((card) => {
    card.vCardHeader('部署任务');
    card.vCardBody('任务等待调度');
    card.vCardFooter((footer) => {
      footer.vButton((button) => {
        button.label('启动任务');
        button.variant('primary');
        button.on('click', () => toast.success('任务已启动', { duration: 0 }));
      });
    });
  });
});
```

`button()` remains the native `<button>` factory. `vButton()` is the compound button component with label, variant, size, disabled and loading state support. Use `variant('primary')` for visual style; use `formType('submit')` when the underlying `<button>` needs a native form type.

`vButton()` also supports a three-argument form: `vButton(content, { attrs: {}, style: {} }, setup)`. The second argument applies element attributes and styles; the final callback receives the initialized button instance for event handlers and state changes.

Component factories keep their own first-argument meaning while sharing the same optional setup tail:

```js
import { hstack, vInput } from 'yoya-ui';

const nameInput = vInput(
  '请输入服务名',
  { attrs: { name: 'serviceName' }, style: { maxWidth: '280px' } },
  (input) => input.required(true)
);

const actions = hstack({ attrs: { 'data-layout': 'actions' }, style: { gap: '8px' } }, (row) =>
  row.child(nameInput)
);
```

`vInput` uses its first string as `placeholder`; layout factories do not need a content argument, so their options can be the first argument. When a positional slot must be skipped, pass `null`, for example `vInput(null, options, setup)`.

Available compound component exports:

- `vButton`
- `vCard`, `vCardHeader`, `vCardBody`, `vCardFooter`
- `vMenu`, `vMenuItem`, `vDropdownMenu`, `vContextMenu`
- `vMessage`, `vMessageContainer`
- `vInput`, `vSelect`, `vTextarea`, `vCheckbox`, `vCheckboxes`, `vSwitch`, `vField`, `vForm`
- `vTimer` (`date`, `datetime-local`, and `time` modes)
- `vTree`
- `vTreeNode`
- `toast`

Browser demo:

```bash
npm run examples:html
```

Then open `/src/examples/Index.html#/components`.

## I18n Text

`I18n` creates language-aware text nodes. The node is still a `ViewTextNode`, so changing language updates DOM text and `toHTML()` output without rebuilding the surrounding `ViewNode` tree.

```js
import { createI18n, div, installI18nStringShortcut } from 'yoya-ui';

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      title: '控制台',
      hello: '你好，{name}'
    },
    en: {
      title: 'Console',
      hello: 'Hello, {name}'
    }
  }
});

div((page) => {
  page.h1(locale.text('title'));
  page.p(locale.text('hello', { name: 'Ada' }));
}).bindTo('#app');

locale.setLanguage('en');
```

String shortcut syntax is also available, following the lightweight style from `yoya-basic`:

```js
const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      'content-key': '内容'
    },
    en: {
      'content-key': 'Content'
    }
  }
});

installI18nStringShortcut(locale);

div((page) => {
  page.p('内容'.s('content-key'));
});

locale.setLanguage('en');
```

`'内容'.s('content-key')` returns an `I18nTextNode`. The string itself is only the default text, and `content-key` is the translation key. Locale messages and the active language are controlled externally through the `I18n` instance.

Message corpora can be nested JSON and can be split across multiple files:

```js
import commonCorpus from './locales/common.json';
import pageCorpus from './locales/page.json';

const locale = createI18n({
  language: 'zh-CN',
  messages: [commonCorpus, pageCorpus]
});

locale.t('page.title');
locale.t('common.save');
```

Each corpus file can either contain multiple languages:

```json
{
  "zh-CN": {
    "page": {
      "title": "控制台"
    }
  },
  "en": {
    "page": {
      "title": "Console"
    }
  }
}
```

Or one language file can be registered with:

```js
locale.registerMessages([
  {
    language: 'zh-CN',
    messages: {
      page: {
        title: '控制台'
      }
    }
  }
]);
```

## Server Template Integration

For backend-rendered pages, build the library and serve `dist/yoya.ui.js` as a static asset:

```html
<div id="app"></div>
<script type="module">
  import { div } from '/static/yoya.ui.js';

  div('Ready').bindTo('#app');
</script>
```

## Router

`router()` creates a hash router outlet. Routes return `ViewNode` instances or plain text, and dynamic params are exposed through the route context.

```js
import { div, router } from 'yoya-ui';

router((r) => {
  r.default('/home');
  r.route('/home', () => div('首页'));
  r.route('/user/:id', ({ params, query }) =>
    div((page) => {
      page.h1(`用户 ${params.id}`);
      page.p(`标签 ${query.tab || '默认'}`);
    })
  );
  r.notFound(({ path }) => div(`未找到 ${path}`));
})
  .bindTo('#app')
  .start();
```

Useful methods:

- `route(pattern, view | { view, beforeEnter })`
- `default(path)`
- `notFound(view)`
- `beforeEach((to, from, router) => true)`
- `navigate(path, { replace })`
- `currentPath()`、`currentParams()`、`currentQuery()`

## Project Layout

```text
src/
  core/
    node.js            ViewNode, ElementNode, VTextNode, DOM helpers, and factories
    i18n.js            I18n and I18nTextNode
    index.js           Core exports
    node.test.js       Core behavior tests
  html/
    index.js           HtmlElementNode and HTML element factories
  svg/
    index.js           SvgElementNode, SVG tag entry, and scoped child methods
  layout/
    index.js           Layout factories
  components/
    index.js           Complex component exports
  examples/
    Index.html         Compound component docs app
  index.js             Public library API
  yoya.base.js         Base ESM entry
  yoya.form.js         Form ESM entry
  yoya.data.js         Data display ESM entry
scripts/
  build-entries.mjs    Build standalone yoya.* ESM bundles
vite.config.js         Vite library and Vitest config
vite.umd.config.js     Full UMD bundle config
```
