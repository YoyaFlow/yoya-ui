# Third-party interop: hand over a real DOM element

The claim behind "no wrapper, no adapter" is a single lifecycle contract. This document shows it
with the official reference (`vEchart`), lists the extension points, and points at the live demos.
For the cross-library comparison (React / Vue / yoya-ui) see
[component-comparison.zh-CN.md](component-comparison.zh-CN.md) (Chinese). For writing your own
component, see [component-authoring.md](component-authoring.md).

## The reference implementation: `vEchart`

yoya-ui creates a real `<div>`, hands it to ECharts, forwards option updates, resizes the chart with
the container, and disposes it on destroy — while **ECharts itself is never bundled or re-wrapped**.

```js
import { div } from '@yoyaflow/yoya-ui';
import { vEchart } from '@yoyaflow/yoya-ui/echart'; // brings no echarts code
import * as echarts from 'echarts'; // you own the dependency
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.vEchart((chart) => {
    chart.echartsLib(echarts); // hand over the real library instance
    chart.height('320px');
    chart.option({
      title: { text: 'Monthly sales' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar'] },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: [120, 200, 150] }]
    });
  });
}).bindTo('#app');
```

The page only needs a `<div id="app"></div>`. No framework mount call, no reactive wrapper around
ECharts' option object, no adapter layer to maintain.

## Why this is not magic

- `vEchart` is a thin node class with a documented lifecycle (`renderDom` → init, `option()` →
  update, `destroy()` → `dispose()`);
- the same contract applies to **any** library that mounts into a DOM node: rich-text editors,
  spreadsheets, maps, trees, code editors — you implement the lifecycle bridge once and compose it
  with `child()` like built-ins;
- components can register into the DSL itself via `registerChildFactories` (that is how
  `page.vEchart(...)` above becomes available as a parent shortcut);
- for SSR pages, wrap browser-only widgets in `vClientOnly()` so the server emits a placeholder and
  the widget loads after hydration:

  ```js
  root.child(vClientOnly(() => vEchart({ echartsLib, option })));
  ```

## Live demos

Full component demos run in the example site:

```bash
npm run examples:html   # open http://localhost:5173/#/components
```

The **third-party** category of the example site runs live Quill, AG Grid Community, Leaflet,
CodeMirror 6 and Toast UI Viewer demos. Those libraries are **not required to be SSR-safe**: every
demo mounts through `vClientOnly`, so the server only emits a placeholder and the library loads on
the client. They exist as example-site devDependencies only — none of them enters the yoya-ui runtime.

The `vEchart` and `vThree` extension entries ship their own demo pages in the same category; each host
is a plain DOM container that the underlying library fills on the client.

Two further standalone prototypes build on the same pattern:

- [industrial-automation prototype](../src/examples/factory-game.html) uses `vThree` as its 3D
  viewport: a grid-based factory simulation with miners, belts and assemblers, plus yoya-ui widgets
  for the toolbar and production stats;
- [SCADA digital-twin demo](../src/examples/scada-demo.html) presents the same stack from an operator
  perspective in a fullscreen first-person walk: fake-data tank levels, pump states, pipe flow and
  alarms, with a game-style HUD and hotkeys built from yoya-ui.
