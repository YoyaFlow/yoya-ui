# Yoya UI

Yoya UI is a small vanilla JavaScript UI foundation library built with Vite. It is meant for backend and full-stack developers who want enough structure to build web UI screens without adopting a large frontend framework.

## What Is Included

- Vite 8 library-mode build with ES module and UMD outputs.
- Vitest + jsdom tests for the core ViewNode contract.
- A browser-native HTML DSL core:
  - `ViewNode` for lifecycle, child nodes, events, and state.
  - `ElementNode` for real DOM elements.
  - `SvgElementNode` for SVG namespace elements.
  - `VTextNode` / `ViewTextNode` and `vText` for internal text nodes.
  - `I18n` and `I18nTextNode` for language-aware text that updates without rebuilding the view tree.
  - Full conforming HTML element factories from the WHATWG HTML standard.
  - Namespace-aware `svg()` tag entry with SVG-only child element extensions.
  - Layout factories such as `flex`, `grid`, `stack`, `hstack`, `vstack`, `center`, `container`, `spacer`, and `divider`.
  - Reserved or conflicting names use explicit aliases: `varTag()` creates `<var>`, and parent nodes use `styleTag()` to create `<style>` without replacing `.style()`.

## Project Documents

- [yoya-basic core summary](docs/yoya-basic-core-summary.md)

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
```

## Examples

- [HTML basic elements](examples/html/README.md)
- [I18n language switch](examples/i18n/README.md)
- [Layout components](examples/layout/README.md)
- [SVG elements](examples/svg/README.md)

## Library Build

Build distributable files:

```bash
npm run build
```

The build outputs:

- `dist/yoya-ui.es.js`
- `dist/yoya-ui.umd.js`

## Usage

```js
import { button, div, h1, p } from 'yoya-ui';

div((page) => {
  page.id('dashboard').className('surface');
  page.h1('Dashboard');
  page.p('Built with ViewNode');
  page.child(
    button('Save').attr('type', 'button').on('click', () => {
      console.log('saved');
    })
  );
}).bindTo('#app');
```

## HTML Element Coverage

`src/elements/html.js` covers the conforming HTML element set. Obsolete HTML elements, MathML, and custom elements are intentionally left out of this module because they need separate compatibility or namespace handling. SVG is provided separately by `src/elements/svg.js`.

Most factories keep the same name as the tag:

```js
import { article, dialog, search, video } from 'yoya-ui';
```

Special cases:

- `varTag('x')` renders `<var>x</var>`.
- `style('body { color: black; }')` creates a top-level `<style>` node.
- `page.styleTag('body { color: black; }')` creates a child `<style>` node, while `page.style('display', 'grid')` remains the CSS style setter.

## SVG Elements

`svg()` creates a `SvgElementNode` with the SVG namespace. SVG child elements are intentionally scoped to the SVG node callback, so `circle()`、`path()`、`svgText()` and similar methods are only available inside `svg((icon) => { ... })`.

```js
import { svg } from 'yoya-ui';

svg((icon) => {
  icon.attr({ viewBox: '0 0 24 24', role: 'img' });
  icon.svgTitle('服务状态');
  icon.circle({ cx: 12, cy: 12, r: 9, fill: 'none', stroke: 'currentColor' });
  icon.path({ d: 'M8 12l2.5 2.5L16 9', stroke: 'currentColor', 'stroke-width': 2 });
  icon.svgText((label) => {
    label.attr({ x: 12, y: 22, 'text-anchor': 'middle' });
    label.text('OK');
  });
}).bindTo('#app');
```

Most SVG child method names match their tag names, such as `circle()`、`path()`、`rect()`、`g()`、`defs()`、`linearGradient()`、`stop()`、`use()` and `symbol()`.

Conflict aliases:

- `icon.svgText()` creates `<text>` and keeps core `text()` as the `VTextNode` shortcut.
- `icon.svgTitle()` creates SVG `<title>` and keeps HTML `title()`.
- `icon.svgStyle()` creates SVG `<style>` and keeps `.style()` / `styleTag()`.
- `icon.svgScript()` creates SVG `<script>` and keeps HTML `script()`.
- `icon.svgA()` creates SVG `<a>` and keeps HTML `a()`.
- `icon.svgSwitch()` creates `<switch>` because `switch` is a JavaScript keyword.

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

Then open `/examples/svg/index.html`.

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

Then open `/examples/layout/index.html`.

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

For backend-rendered pages, build the library and serve `dist/yoya-ui.es.js` as a static asset:

```html
<div id="app"></div>
<script type="module">
  import { div } from '/static/yoya-ui.es.js';

  div('Ready').bindTo('#app');
</script>
```

## Project Layout

```text
src/
  core/
    view-node.js       ViewNode and VTextNode
    i18n.js            I18n and I18nTextNode
    element-node.js    DOM element node
    svg-element-node.js SVG namespace DOM element node
    factory.js         Factory generation
    index.js           Core exports
    view-node.test.js  Core behavior tests
  elements/
    html.js            HTML element factories
    svg.js             SVG element factories
  layout/
    index.js           Layout factories
  index.js             Public library API
examples/
  html/                Basic HTML element usage checks
  i18n/                I18n language switch demo
  layout/              Layout component composition demo
  svg/                 SVG tag entry and child extension demo
vite.config.js         Vite library and Vitest config
```
