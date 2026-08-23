# SVG 元素演示

这个目录演示 `svg()` 标签入口和 `SvgElementNode` 内部扩展方法。

核心约定：

- 普通 HTML DSL 里只添加 `svg()` 入口。
- SVG 子元素只能在 `svg((icon) => { ... })` 回调内部添加。
- `circle()`、`path()`、`rect()`、`text()`、`title()` 等不会作为 SVG 顶层导出，也不会出现在普通 HTML 父节点上。
- SVG 节点仍支持 `attr()`、`className()`、`style(name, value)`、`on()`、`child()` 和 `toHTML()`。
- `style('...')` 在 SVG 作用域内创建 `<style>` 标签；`style(name, value)` 和 `styles({...})` 设置 CSS 样式。

示例写法：

```js
import { section, vText } from 'yoya-ui';

const chartModes = {
  live: {
    label: '当前：实时请求',
    bars: [42, 55, 38, 63]
  },
  peak: {
    label: '当前：历史峰值',
    bars: [71, 84, 69, 92]
  }
};

export function renderTrafficChartExample(target = '#app') {
  const chartStatus = vText(chartModes.live.label);
  const barNodes = [];
  const valueNodes = [];
  let mode = 'live';
  let toggleButton = null;

  const applyMode = (nextMode) => {
    chartModes[nextMode].bars.forEach((value, index) => {
      const height = value * 1.2;
      barNodes[index].attr({ height, y: 160 - height });
      valueNodes[index].textContent(value);
    });
    toggleButton.attr('data-mode', nextMode);
    chartStatus.textContent(chartModes[nextMode].label);
  };

  const root = section((page) => {
    page.id('traffic-chart');
    page.h1('请求趋势');
    page.p('SVG 子元素只在 svg 回调内部创建，节点引用可以像普通 ViewNode 一样更新。');

    page.svg((icon) => {
      icon.attr({ viewBox: '0 0 96 96', role: 'img', 'aria-labelledby': 'status-title' });
      icon.title((title) => {
        title.id('status-title');
        title.text('服务状态正常');
      });
      icon.defs((defs) => {
        defs.linearGradient((gradient) => {
          gradient.id('status-fill');
          gradient.stop({ offset: '0%', 'stop-color': '#1f6feb' });
          gradient.stop({ offset: '100%', 'stop-color': '#2da44e' });
        });
      });
      icon.circle({ cx: 48, cy: 48, r: 34, fill: 'url(#status-fill)' });
      icon.path({ d: 'M30 49l11 11 25-28', fill: 'none', stroke: '#fff', 'stroke-width': 4 });
    });

    page.output((output) => output.child(chartStatus));
    page.button((button) => {
      toggleButton = button;
      button.attr('type', 'button').attr('data-mode', 'live');
      button.text('切换数据');
      button.on('click', () => {
        mode = mode === 'live' ? 'peak' : 'live';
        applyMode(mode);
      });
    });

    page.svg((chart) => {
      chart.attr({ viewBox: '0 0 320 190', role: 'img', 'aria-label': '请求趋势柱状图' });
      chart.line({ x1: 24, y1: 160, x2: 300, y2: 160, stroke: '#98a6b8' });
      chartModes.live.bars.forEach((value, index) => {
        const x = 42 + index * 64;
        const height = value * 1.2;
        chart.rect((bar) => {
          barNodes[index] = bar;
          bar.attr({ x, y: 160 - height, width: 32, height, rx: 5, fill: '#246bfe' });
        });
        chart.text((label) => {
          label.attr({ x: x + 16, y: 150 - height, 'text-anchor': 'middle' });
          const valueText = vText(value);
          valueNodes[index] = valueText;
          label.child(valueText);
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderTrafficChartExample('#app');
}
```

当前演示包含：

- 状态图标：`title`、`defs`、`linearGradient`、`circle`、`path`、`text`。
- 趋势柱状图：`rect`、`line`、`text`，并通过按钮事件更新现有 SVG 子元素。
- 服务拓扑图：`marker`、`path`、`line`、`rect`、`circle`、`text`。

运行方式：

```bash
npm run examples:svg
```

然后打开 Vite 输出的地址，访问 `/examples/svg/index.html`。
