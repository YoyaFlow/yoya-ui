# GenUI kit authoring guide

A GenUI kit is **your own component package**: components are used as JSON by a model, and a host
(`genui-mcp` / yoya-genui) loads the whole family dynamically from one manifest. yoya-ui ships the
general-purpose components; a kit is how "components only this business needs" join the same
protocol — the model still writes JSON, and no host change is required.

One kit is two halves, and this guide keeps them apart:

| Half         | Artifact                 | Read by                   | Answers                                           |
| ------------ | ------------------------ | ------------------------- | ------------------------------------------------- |
| **Manifest** | `kit.json` (generated)   | host, model (catalog)     | which components exist, when to use them, props   |
| **Runtime**  | `dist/yoya.kit.js` (ESM) | browser (host `import()`) | how JSON becomes real nodes, how live values flow |

Reference implementation: [`@yoyaflow/yoya-kit`](https://github.com/yoyaflow/yoya-kit)
(27 chart components + 12 elastic layout components).
Scaffold for this guide: `create-yoya-ui my-kit --template genui-kits`.
Component-writing rules (shape A/B, `vn` identity, parts and slots) live in
[component-authoring.md](component-authoring.md).

## 1. Load path

```text
GENUI_MCP_KITS=<kit dir>/kit.json
   │
   ├─ server: validates namespace / version / components[].name / runtime.entry
   │          → merges into genui_catalog (this is where the model "sees" your components)
   └─ page shell: import(runtime.entry) → GenUI.use(module[runtime.export])
                  → components enter the registry → `my-org/my-kit#PanelKit` renders
```

Two rules follow from this:

1. **Manifest and implementation must agree**: the host only publishes capabilities from the
   manifest, and a broken implementation never "half-loads" — so the manifest is generated, and
   `npm run kit:check` is the gate;
2. **A kit never injects into yoya-ui's default registry**: the host must call
   `GenUI.use(kitPlugin)` explicitly; unloading happens in reverse order on page exit
   (`dispose`), and a failing kit only takes its own components down.

## 2. Quick start

```bash
npx create-yoya-ui my-kit --template genui-kits
cd my-kit
npm install
npm run dev        # playground: component catalog + live rendering of examples/*.json
```

Two things to change first:

1. `namespace` / `repo` in `kit.json`, plus the same metadata inside the component implementation
   (`KIT_NAMESPACE` / `KIT_VERSION` / `repo` / `source` — `kit:check` compares these four strings);
2. replace `components/demo-kit/` with your own family (copying it is the fastest start).

## 3. Layout and sources of truth

```text
my-kit/
├─ kit.json                  # manifest (generated): namespace / version / runtime / components[]
├─ components/
│  └─ demo-kit/
│     ├─ component.json      # metadata source of truth (one dir may declare a whole family)
│     ├─ impl.js             # runtime: component implementations + family plugin
│     └─ examples/           # example schemas (what the playground renders)
├─ indexes/                  # projections (generated): by-category / by-scene
├─ src/index.js              # package entry + kitPlugin (runtime.export points at it)
├─ scripts/generate-kit.mjs  # component.json → kit.json + indexes (plain Node, no deps)
├─ playground/               # local playground (never shipped)
└─ test/kit.test.js          # self-check
```

Conventions:

- **`components/*/component.json` is the only source of truth**; `kit.json` and `indexes/` are
  rewritten by `npm run kit:generate` — never edit them by hand (the next run overwrites them and
  `kit:check` fails).
- **One version, one place**: `package.json` `version`. It is written into `kit.json`, and the
  generator verifies the implementation's `KIT_VERSION`; bumping = `package.json` + `KIT_VERSION`.
- **Component short names are PascalCase** (`PanelKit`); the generator expands them to
  `my-org/my-kit#PanelKit`. Third parties must not use the `v` prefix (`v*` is reserved by
  yoya-ui), and must not collide with libraries the host already installed.
- A directory may declare **several** components (`components: [...]`) or just one (the top level
  is the component entry); one implementation and one runtime entry per family is the normal shape.

## 4. Run scripts

| Command                | When                 | What it does                                                                     |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`          | while writing        | playground: catalog + live examples + "write data +1" buttons (live-value check) |
| `npm run kit:generate` | after metadata edits | rewrites `kit.json` and `indexes/` from `component.json`                         |
| `npm run kit:check`    | before commit / CI   | exits 1 when the manifest drifted (also checks runtime metadata)                 |
| `npm test`             | before commit / CI   | manifest parity / plugin install / every example renders / live update in place  |
| `npm run build`        | release              | builds `dist/yoya.kit.js` (`@yoyaflow/*` stays external)                         |
| `npm run preview`      | inspect the build    | previews `playground-dist/`                                                      |
| `npm run verify`       | one-shot gate        | `kit:check` + `test` + `build`                                                   |

The playground runs the **host's** sequence — `createGenUI()` → `GenUI.use(yoyaUIPlugin)` →
`GenUI.use(kitPlugin)` → `surface.bindTo(container)` — so what works there works inside
`genui-mcp`.

## 5. Writing a component

### 5.1 Factory shape: `(props, place)`

```js
export function PanelKit(props = {}, place) {
  const { title, description, tone = 'neutral', ...rest } = props;

  return div(
    // props go into factory arguments; values may hold handles
    { vn: 'PanelKit', 'data-tone': tone, style: { display: 'flex', padding: '16px' } },
    (root) => {
      if (title) root.child(h3({ vn: 'PanelKitTitle' }, (node) => node.child(title)));
      place?.(root); // ← content slot: children are already rendered, position is yours
    }
  );
}
```

- `props` come from JSON (they may carry live-value handles);
- `place` is GenUI's content-placement callback — call it where the component decides the position;
- **Never read globals, DOM structure, or keep node handles inside the component**: state belongs to
  the GenUI data model (section 7).

### 5.2 Component descriptor: `kind` / `props` / content channels

```js
export const demoKitPlugin = createPlugin({
  id: `${KIT_NAMESPACE}@${KIT_VERSION}#demo-kit`,
  namespace: KIT_NAMESPACE,
  version: KIT_VERSION,
  repo: 'https://github.com/your-org/my-kit',
  source: 'components/demo-kit/impl.js',
  components: {
    PanelKit: { factory: PanelKit, kind: 'element' },
    MetricKit: {
      factory: MetricKit,
      kind: 'element',
      props: { value: { live: true }, label: { live: true } }
    },
    BadgeKit: { factory: BadgeKit, kind: 'element', childrenProp: 'children' }
  }
});
```

| Key                       | Purpose                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `factory`                 | component factory (required), shape `(props, place) => node`                                                                                                                                                      |
| `kind`                    | `'element'`: the factory returns an element/node and content lands through `place` (GenUI wraps it in a transparent vNode when slot content has to be delivered — the DOM is unchanged); default is `'component'` |
| `props`                   | **props mapping**: by default a prop is passed by name with a snapshot value; `{ live: true }` hands the live handle to the component; `attr:` / `style:` / `class:` / `command:` prefixes switch channels        |
| `childrenProp`            | content goes through a prop (GenUI renders children _before_ calling the factory and sets `props.children`)                                                                                                       |
| `textProp`                | where the node-level `text` shorthand lands (`textProp: 'label'` → `view.label(text)`)                                                                                                                            |
| `childCommand`            | content goes through a command callback (the command receives the content host)                                                                                                                                   |
| `itemBridge`              | container + item bridge (e.g. `vTabs` / `vTab`): items use the container command, their content goes to the item content slot                                                                                     |
| `aliases` / `description` | aliases / description (aliases only affect reference syntax, not the full name)                                                                                                                                   |

Two traps:

- **`childrenProp` disables the node-level `text` shorthand**: with `childrenProp` set, `"text"`
  in the schema never reaches the component (the text channel yields to the content channel) —
  expose text as `props.text` and document it in `dataContract`;
- **Default is a snapshot, not a live value**: without `live: true` GenUI passes the evaluated
  value once. Props that must update when the data model changes need `live: true`.

### 5.3 Wrapping a yoya-ui component (the most common shape)

```js
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export function BadgeKit(props = {}) {
  const { children, count, text, status, dot } = props;

  return vBadge({ children, count, text, status, dot }); // handles pass straight through
}
```

Register it with `kind: 'element'`, `childrenProp: 'children'` and
`props: { count: { live: true } }`. Notes:

- `@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` are **peerDependencies** (kept external at build
  time): listing them under `dependencies` installs a second core in the host and breaks the
  singleton;
- styles live inside the kit (inline styles / CSS variables) or are inlined into the artifact — the
  host imports one JS entry and will not look for your CSS file;
- component-internal commands (`badge.count()`) stay internal; the JSON surface only exposes props.
  If a handle prop can express the update, do not add a command.

## 6. Writing the manifest fields

Every field in `component.json` ends up in `kit.json`, and **these are exactly what the model reads
when picking a component** — they are an interface, not comments. Progressive disclosure: put
selection-changing facts (category / scenes / summary / whenToUse / notFor) up front, keep usage
detail in `dataContract` and `props`, and record traps under `pitfalls`.

| Field          | Required | How to write it                                                                      |
| -------------- | -------- | ------------------------------------------------------------------------------------ |
| `shortName`    | yes      | PascalCase short name (`PanelKit`); the generator expands it to `namespace#PanelKit` |
| `category`     | yes      | one of `kit.json`'s `categoryVocabulary` (register new categories first)             |
| `summary`      | yes      | one sentence: what this component is                                                 |
| `dataContract` | yes      | data contract: content slot + key props, including live/two-way notes                |
| `props`        | yes      | `{ propName: "example value or type" }` for every prop                               |
| `scenes`       | advised  | scene tags (feed `indexes/by-scene.json`)                                            |
| `whenToUse`    | advised  | when to pick it                                                                      |
| `notFor`       | advised  | when not to (point at the alternative so the model does not guess)                   |
| `pitfalls`     | advised  | traps you hit: correct usage and default-value surprises                             |
| `entry`        | yes      | implementation file (directory-level `entry`, overridable per component)             |

## 7. Live values and the data model

All reactivity lives in the data model; the kit only decides which props accept handles:

```json
{
  "data": { "metrics": { "orders": 128 } },
  "root": {
    "type": "my-org/my-kit#MetricKit",
    "props": { "label": "今日订单", "value": "@:/metrics/orders", "unit": "单" }
  }
}
```

- `value` is declared `live: true`, so it receives a **live handle**: after
  `surface.data.write('/metrics/orders', 999)` the node shows 999 **in place** (no re-render);
- props without `live` are snapshots; use a reference (or add `live: true`) when they must follow
  the data;
- **never normalise props at build time**: `String(prop)` / `Number(prop)` / `prop || fallback`
  turns a handle into a constant and silently breaks reactivity. Keep state as-is and map with
  `computed(() => ...)`;
- derivation, validation and visibility are page-level schema concerns (`computed` / `validate` /
  conditional rendering) — keep them out of kit components.

## 8. Packaging and release

```bash
npm run verify       # kit:check + test + build
```

- **Artifact**: `dist/yoya.kit.js` (ESM). `kit.json`'s `runtime.entry` points at it and
  `runtime.export` at the `kitPlugin` exported by `src/index.js`;
- **external**: `@yoyaflow/*` never enters the artifact (one `external` line in
  `vite.config.js`); your own dependencies (echarts, dayjs, …) are bundled normally;
- **peerDependencies**: declare `@yoyaflow/yoya-core` / `@yoyaflow/yoya-ui` as peers only, and
  ship `kit.json` / `dist` / `components` / `indexes` plus type declarations in `files`;
- **`process.env.NODE_ENV`**: replaced with a literal so the artifact initialises without a Node
  global (already configured in the template);
- **versions**: one runtime holds one version per library (the host rejects a second one); bump
  `package.json` and `KIT_VERSION` together.

## 9. Wiring it into a host

genui-mcp (recommended, one setting):

```powershell
$env:GENUI_MCP_KITS = "D:\path\to\my-kit\kit.json"   # separate multiple paths with the path separator
```

Programmatic use:

```js
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { kitPlugin } from './dist/yoya.kit.js';

const genui = createGenUI();
const dispose = genui.use(kitPlugin); // dispose() unloads the whole family
const surface = genui.fromJson(schema);

surface.bindTo(document.querySelector('#app'));
```

Host-side validation and isolation (`genui-mcp`): `namespace` must look like `owner/repo`,
`version` must be non-empty, `components[].name` must be `namespace#PascalCase`, and
`runtime.entry` must be a local `.js` / `.mjs` file inside the kit directory. Duplicate component
names (across kits or with an installed library) refuse to load; an invalid manifest fails at
startup instead of half-loading a capability surface that disagrees with the implementation.

## 10. Troubleshooting

| Symptom                                           | Cause and fix                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Hatched placeholder blocks / `data-genui-unknown` | `type` did not resolve: wrong short name, namespace mismatch (write `namespace#Name`), or the host never called `GenUI.use(kitPlugin)` |
| every prop is `undefined`                         | are they inside `props: {...}` (not directly on the node), and do names match the `component.json` contract?                           |
| writing the data model does not update the view   | the prop lacks `{ live: true }`, or the component normalised the handle into a constant                                                |
| node-level `text` does nothing                    | the component declares `childrenProp` (text channel yields to content): expose text as `props.text`                                    |
| content lands in the wrong place                  | the component never called `place?.(root)`, or it also called `child()` by hand (one payload per slot)                                 |
| `kit:check` reports drifting metadata             | `KIT_NAMESPACE` / `KIT_VERSION` / `repo` / `source` in `impl.js` disagree with `kit.json`                                              |
| `kit:check` reports an out-of-date manifest       | `component.json` changed without re-running `npm run kit:generate`                                                                     |
| host reports `runtime.entry` missing              | run `npm run build` first; the entry must be a local `.js` / `.mjs` inside the kit directory                                           |
| host reports a component name conflict            | the short name collides with an installed library or a built-in: rename it (PascalCase, no `v` prefix)                                 |
| passing functions through props                   | impossible: the JSON surface only carries data. Use string templates, data-driven mapping, and `action`s                               |
