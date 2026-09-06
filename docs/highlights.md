# yoya-ui Highlights

> Only capabilities that are painful elsewhere and nearly one-line / one-entry in yoya-ui are listed here: i18n, access control, dual-mode SSR, declarative DSL, and forms.

## 1. i18n: strings are the dictionary; switching language refreshes automatically

No i18n library and no key files. The default text is the string itself; `.s(key, params?)` turns it into a reactive text node.

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

locale.setLanguage('en'); // page text refreshes automatically
```

- `.s()` returns an `I18nTextNode` that subscribes to the locale; `setLanguage()` refreshes the whole page. Dot paths, `{param}` interpolation, and fallback are supported.
- Persistence works out of the box: pass `storageKey` to write localStorage automatically; pass `key` to share one `yoya-ui:i18n` record across instances.
- SSR isolates locales per request: pass an `i18n` instance or `(state) => I18n` factory at the entry; `resolveLocale` resolves cookie > query > Accept-Language.

## 2. Access control: declare a resource code; hidden / read-only / disabled are automatic

No `v-if(v-permission)`, no hand-written `disabled`. Declare a bare resource code on the node and the render pipeline decides.

```js
import { createAccess, installAccess, vForm, vInput, button } from '@yoyaflow/yoya-ui';

installAccess(createAccess({ permissions: ['system:member'] }));

vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name', value: 'Ada' })); // no write permission -> read-only/disabled
  form.child(button('Export').access('system:export')); // nearest override by its own code
}).bindTo('#app');
```

- No read permission -> not rendered (not output by SSR either); read without write -> `disabled / readonly / aria-disabled`; write -> normal.
- Permission scope inherits top-down and can be overridden nearest-first. SPAs use `installAccess`; SSR injects `options.access` per request.

## 3. Same-source dual-mode SSR: one codebase, a few lines per side

The page is a single `createPage(requestState)` factory shared by server and client.

```js
// page.js - shared by both sides
export function HomePage(state) {
  return div((root) => root.h1('首页'.s('home')));
}

// server: render the full HTML document
import { renderPage } from '@yoyaflow/yoya-ui/ssr';
const html = renderPage({ page, head, body }, state, { messages });

// client: one line (hydrate when SSR HTML exists, otherwise mount)
import { hydrateOrMount } from '@yoyaflow/yoya-ui/ssr';
hydrateOrMount(HomePage, { messages });
```

- `renderToString` outputs HTML plus safely serialized initial state; when `#app` contains server HTML, `hydrate()` adopts the DOM and only binds events; otherwise `mount()` renders.
- Determinism is built in: `withIdAllocator` guarantees the same input produces the same ids and isolates requests; the tree is destroyed after render; oversized pages fall back to client rendering when `maxNodes` is exceeded.

## 4. Declarative DSL: no JSX, no virtual DOM, no build step

Views are plain JS functions describing real DOM. `setup` callbacks plus parent shortcuts make composition read naturally.

```js
import { div, vCard, vButton, toast } from '@yoyaflow/yoya-ui';

div((page) => {
  page.vCard((card) => {
    card.vCardHeader('Service details');
    card.vCardBody((body) => body.p('Running'));
    card.child(
      vButton('Start', (b) => b.variant('primary').on('click', () => toast.success('Started')))
    );
  });
}).bindTo('#app');
```

- The same code runs in the browser via `.bindTo()` or on the server via `toHTML()` / SSR; `child()` accepts ViewNodes, component objects, strings, and numbers uniformly.
- `registerChildFactories` registers components as parent shortcuts (`card.vCardHeader`), so third-party components can extend the DSL too.

## 5. Forms: one collection point, view/edit built in

No hand-written state, no reading each input value one by one. Put controls inside `vForm` and call `form.values()` once; `vField` provides view and edit modes.

```js
import { vButton, vCard, vForm, vInput, vText } from '@yoyaflow/yoya-ui';

const summary = vText('Not submitted');
const form = vForm((f) => {
  f.vField((field) => {
    field.label('Service');
    field.control((editor) => editor.vInput({ name: 'serviceName', value: 'api-gateway' }));
  });
  f.vField((field) => {
    field.label('Owner');
    field.control((editor) => editor.vInput({ name: 'owner', value: 'SRE Team' }));
  });
});

vCard((card) => {
  card.vCardBody((body) => body.child(form));
  card.vCardFooter((footer) => {
    footer.vButton('Submit', (b) =>
      b.on('click', () => summary.textContent(JSON.stringify(form.values())))
    );
  });
}).bindTo('#app');
```

- `form.values()` collects every field once; `form.values(next)` resets the whole form.
- `vField` switches between `field.mode('edit' | 'view')` (or `field.edit()` / `field.view()`), so profile and detail pages do not need two rendering paths.
- SSR form validation runs once in the factory; the server bakes error state into the HTML and the client continues validating with the same rules.
