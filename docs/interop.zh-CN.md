# 第三方接入：交出一个真实 DOM 元素

"不需要 Wrapper、不需要 Adapter"这句话背后只有一条生命周期契约。本文用官方参照实现
（`vEchart`）说明它，列出扩展开口，并指向在线演示。跨库对照（React / Vue / yoya-ui）见
[component-comparison.zh-CN.md](component-comparison.zh-CN.md)；自己写组件的规范见
[component-authoring.zh-CN.md](component-authoring.zh-CN.md)。

## 参照实现：vEchart

官方 `vEchart` 组件就是第三方扩展接入的参照实现：yoya-ui 创建一个真实 `<div>`，把它交给
ECharts，转发 option 更新，随容器自适应尺寸，并在销毁时 dispose——**ECharts 本身从不被打包或
重新包装**。

```js
import { div } from '@yoyaflow/yoya-ui';
import { vEchart } from '@yoyaflow/yoya-ui/echart'; // 不携带任何 echarts 代码
import * as echarts from 'echarts'; // 依赖由你自己掌握
import '@yoyaflow/yoya-ui/ui.css';

div((page) => {
  page.vEchart((chart) => {
    chart.echartsLib(echarts); // 交出真实库实例
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

页面只需要一个 `<div id="app"></div>`。没有框架挂载调用、没有包裹 ECharts option 的响应式外壳、
也不需要维护任何适配层。

## 为什么这不是魔法

- `vEchart` 是一个生命周期清晰记录的薄节点类（`renderDom` → 初始化，`option()` → 更新，
  `destroy()` → `dispose()`）；
- 同一契约适用于**任何**能挂载到 DOM 节点的库：富文本编辑器、表格、地图、树、代码编辑器……
  生命周期桥接只需写一次，之后就能像内置组件一样通过 `child()` 组合；
- 组件还可以通过 `registerChildFactories` 注册进 DSL 本身（上面的 `page.vEchart(...)` 之所以
  能作为父节点快捷方法使用，就是这个机制）；
- 在 SSR 页面中，用 `vClientOnly()` 包住仅浏览器可用的组件，服务端输出占位，hydration 之后再
  加载：

  ```js
  root.child(vClientOnly(() => vEchart({ echartsLib, option })));
  ```

## 在线演示

完整组件演示可直接在示例站点运行：

```bash
npm run examples:html   # 打开 http://localhost:5173/#/components
```

示例站"第三方扩展"分类还提供 Quill、AG Grid Community、Leaflet、CodeMirror 6 与 Toast UI Viewer
的可运行演示。这些第三方库**不需要支持服务端渲染**：每个演示都经 `vClientOnly` 挂载，服务端只
输出占位，库在客户端加载。它们只作为示例站 devDependency 存在，不会进入 yoya-ui 运行时依赖。

`vEchart` 与 `vThree` 扩展入口在同类目下有各自的演示页：宿主只是一个普通 DOM 容器，由底层库在
客户端填充。

另外两个独立原型同样建立在这套范式上：

- [工业自动化原型](../src/examples/factory-game.html)用 `vThree` 作为 3D 视口：基于网格的工厂
  模拟（矿机、传送带、组装机），工具栏与产量统计由 yoya-ui 组件承担；
- [SCADA 数字孪生演示](../src/examples/scada-demo.html)从操作员视角呈现同一套技术栈：全屏第一
  人称行走巡厂，假数据驱动的罐体液位、泵状态、管线流量与报警，配合 yoya-ui 的游戏化 HUD 与快捷键。
