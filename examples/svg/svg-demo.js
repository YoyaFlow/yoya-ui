import { section, vText } from '../../src/index.js';

const chartModes = {
  realtime: {
    label: '当前：实时请求',
    pressed: 'false',
    bars: [
      ['08:00', 42, 68],
      ['10:00', 55, 88],
      ['12:00', 38, 61],
      ['14:00', 63, 101],
      ['16:00', 47, 75]
    ]
  },
  peak: {
    label: '当前：历史峰值',
    pressed: 'true',
    bars: [
      ['08:00', 71, 112],
      ['10:00', 84, 132],
      ['12:00', 69, 109],
      ['14:00', 92, 144],
      ['16:00', 76, 120]
    ]
  }
};

/**
 * 渲染 SVG 元素演示，展示 svg 入口和 SVG 节点内部扩展方法。
 */
export function renderSvgExample(target = '#app') {
  const chartStatus = vText(chartModes.realtime.label);
  const barNodes = [];
  const labelTextNodes = [];
  let mode = 'realtime';
  let toggleButton = null;

  const applyChartMode = (nextMode) => {
    const config = chartModes[nextMode];

    config.bars.forEach(([, value, height], index) => {
      const bar = barNodes[index];
      const labelText = labelTextNodes[index];

      bar.attr({
        height,
        y: 160 - height
      });
      labelText.textContent(value);
    });

    toggleButton.attr('aria-pressed', config.pressed);
    toggleButton.attr('data-chart-mode', nextMode);
    chartStatus.textContent(config.label);
  };

  const root = section((page) => {
    page.id('svg-demo').className('svg-shell');

    page.header((header) => {
      header.className('svg-header');
      header.h1('SVG 元素演示');
      header.p('使用唯一的 svg 标签入口，在 SVG 节点内部添加 circle、path、rect、text 等子元素。');
    });

    page.section((panel) => {
      panel.className('svg-panel status-panel');
      panel.attr('data-svg-panel', 'status-icon');
      panel.h2('状态图标');
      panel.p('title、defs、linearGradient、circle、path 和 text 组合成可访问的状态图标。');

      panel.svg((icon) => {
        icon.id('service-status-icon');
        icon.className('status-icon');
        icon.attr({ viewBox: '0 0 96 96', role: 'img', 'aria-labelledby': 'status-icon-title' });
        icon.title((title) => {
          title.id('status-icon-title');
          title.text('服务状态正常');
        });
        icon.defs((defs) => {
          defs.linearGradient((gradient) => {
            gradient.id('status-fill');
            gradient.attr({ x1: '0', y1: '0', x2: '1', y2: '1' });
            gradient.stop({ offset: '0%', 'stop-color': '#1f6feb' });
            gradient.stop({ offset: '100%', 'stop-color': '#2da44e' });
          });
        });
        icon.circle({ cx: 48, cy: 48, r: 34, fill: 'url(#status-fill)' });
        icon.path({
          d: 'M30 49l11 11 25-28',
          fill: 'none',
          stroke: '#ffffff',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': 2
        });
        icon.text((label) => {
          label.attr({ x: 48, y: 84, 'text-anchor': 'middle' });
          label.text('OK');
        });
      });
    });

    page.section((panel) => {
      panel.className('svg-panel chart-panel');
      panel.attr('data-svg-panel', 'metric-chart');

      panel.div((titleRow) => {
        titleRow.className('chart-title-row');
        titleRow.h2('趋势柱状图');
        titleRow.button((button) => {
          toggleButton = button;
          button.id('toggle-chart-mode');
          button.attr('type', 'button');
          button.attr('aria-pressed', chartModes.realtime.pressed);
          button.attr('data-chart-mode', 'realtime');
          button.text('切换数据');
          button.on('click', () => {
            mode = mode === 'realtime' ? 'peak' : 'realtime';
            applyChartMode(mode);
          });
        });
      });

      panel.output((status) => {
        status.id('chart-mode-status');
        status.child(chartStatus);
      });

      panel.svg((chart) => {
        chart.id('svg-metric-chart');
        chart.className('metric-chart');
        chart.attr({ viewBox: '0 0 420 220', role: 'img', 'aria-labelledby': 'metric-chart-title' });
        chart.title((title) => {
          title.id('metric-chart-title');
          title.text('请求趋势柱状图');
        });
        chart.defs((defs) => {
          defs.linearGradient((gradient) => {
            gradient.id('bar-fill');
            gradient.attr({ x1: '0', y1: '0', x2: '0', y2: '1' });
            gradient.stop({ offset: '0%', 'stop-color': '#1f6feb' });
            gradient.stop({ offset: '100%', 'stop-color': '#6f42c1' });
          });
        });
        chart.line({ x1: 40, y1: 160, x2: 390, y2: 160, stroke: '#98a6b8', 'stroke-width': 1 });
        chart.line({ x1: 40, y1: 32, x2: 40, y2: 160, stroke: '#98a6b8', 'stroke-width': 1 });

        chartModes.realtime.bars.forEach(([time, value, height], index) => {
          const x = 70 + index * 62;
          const valueText = vText(value);

          chart.rect((bar) => {
            barNodes[index] = bar;
            bar.attr({
              'data-chart-bar': index,
              x,
              y: 160 - height,
              width: 32,
              height,
              rx: 6,
              fill: 'url(#bar-fill)'
            });
          });
          chart.text((label) => {
            label.attr({
              'data-chart-label': index,
              x: x + 16,
              y: 160 - height - 8,
              'text-anchor': 'middle'
            });
            label.child(valueText);
          });
          chart.text((label) => {
            label.className('axis-label');
            label.attr({ x: x + 16, y: 186, 'text-anchor': 'middle' });
            label.text(time);
          });

          labelTextNodes[index] = valueText;
        });
      });
    });

    page.section((panel) => {
      panel.className('svg-panel topology-panel');
      panel.attr('data-svg-panel', 'topology-map');
      panel.h2('服务拓扑');
      panel.p('marker、line、rect 和 text 可以构成轻量流程图，不需要图片资源。');

      panel.svg((map) => {
        map.id('svg-topology-map');
        map.className('topology-map');
        map.attr({ viewBox: '0 0 460 210', role: 'img', 'aria-labelledby': 'topology-title' });
        map.title((title) => {
          title.id('topology-title');
          title.text('服务拓扑图');
        });
        map.defs((defs) => {
          defs.marker((marker) => {
            marker.id('arrow-head');
            marker.attr({
              markerWidth: 10,
              markerHeight: 10,
              refX: 8,
              refY: 3,
              orient: 'auto',
              markerUnits: 'strokeWidth'
            });
            marker.path({ d: 'M0,0 L0,6 L9,3 z', fill: '#5a6575' });
          });
        });
        map.rect({ x: 32, y: 70, width: 96, height: 54, rx: 8, fill: '#ffffff', stroke: '#1f6feb' });
        map.text((label) => {
          label.attr({ x: 80, y: 102, 'text-anchor': 'middle' });
          label.text('API');
        });
        map.line({
          x1: 128,
          y1: 97,
          x2: 202,
          y2: 97,
          stroke: '#5a6575',
          'stroke-width': 2,
          'marker-end': 'url(#arrow-head)'
        });
        map.rect({ x: 206, y: 48, width: 112, height: 48, rx: 8, fill: '#ffffff', stroke: '#2da44e' });
        map.text((label) => {
          label.attr({ x: 262, y: 78, 'text-anchor': 'middle' });
          label.text('Worker');
        });
        map.rect({ x: 206, y: 122, width: 112, height: 48, rx: 8, fill: '#ffffff', stroke: '#bf8700' });
        map.text((label) => {
          label.attr({ x: 262, y: 152, 'text-anchor': 'middle' });
          label.text('Queue');
        });
        map.line({
          x1: 318,
          y1: 72,
          x2: 382,
          y2: 96,
          stroke: '#5a6575',
          'stroke-width': 2,
          'marker-end': 'url(#arrow-head)'
        });
        map.line({
          x1: 318,
          y1: 146,
          x2: 382,
          y2: 108,
          stroke: '#5a6575',
          'stroke-width': 2,
          'marker-end': 'url(#arrow-head)'
        });
        map.circle({ cx: 402, cy: 102, r: 30, fill: '#ffffff', stroke: '#6f42c1' });
        map.text((label) => {
          label.attr({ x: 402, y: 108, 'text-anchor': 'middle' });
          label.text('DB');
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderSvgExample('#app');
}
