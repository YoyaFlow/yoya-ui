import { svg, vCard, vChart } from '@yoyaflow/yoya-ui';

/* global document */

const VIEW_BOX = { height: 260, width: 640 };
const PAD = { bottom: 34, left: 44, right: 16, top: 14 };
const SERIES_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6'];

// vChart 内置 SVG 适配器：bar 柱状图 / line 折线图，零外部依赖。
export function DashboardChart({ labels = [], series = [], title = '', type = 'bar', height = 280 } = {}) {
  const chart = vChart({
    adapter: createSvgAdapter(),
    data: { labels, series },
    height,
    options: { type }
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader(title);
        card.vCardBody((body) => {
          body.div((host) => {
            host.style({ minWidth: '0', width: '100%' });
            host.child(chart);
          });
        });
      });
    },
    update(next) {
      chart.data(next);
      return this;
    }
  };
}

function createSvgAdapter() {
  return {
    init(host, context) {
      const instance = { host };
      renderChart(instance, context);
      return instance;
    },
    update(instance, context) {
      renderChart(instance, context);
    },
    resize() {},
    destroy() {}
  };
}

function renderChart(instance, context) {
  const root = buildChartSvg(context.data, context.options);
  const legend = buildLegend(context.data?.series ?? []);
  instance.host.replaceChildren(legend, root.renderDom());
}

function buildLegend(series) {
  const legend = document.createElement('div');
  legend.style.cssText =
    'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:8px;' +
    'font-size:12px;color:var(--yoya-color-text-muted,#64748b);';
  series.forEach((entry, index) => {
    const color = entry.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
    const dot = document.createElement('span');
    dot.style.cssText =
      `background:${color};border-radius:2px;display:inline-block;` +
      'height:8px;margin-right:5px;width:8px;';
    const text = document.createElement('span');
    text.textContent = entry.name ?? `系列 ${index + 1}`;
    const item = document.createElement('span');
    item.style.cssText = 'align-items:center;display:inline-flex;';
    item.append(dot, text);
    legend.appendChild(item);
  });
  return legend;
}

function buildChartSvg(data, options) {
  const labels = data?.labels ?? [];
  const series = (data?.series ?? []).map((entry, index) => ({
    color: entry.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
    data: entry.data ?? [],
    name: entry.name ?? `系列 ${index + 1}`
  }));
  const type = options?.type ?? 'bar';
  const plotHeight = VIEW_BOX.height - PAD.top - PAD.bottom;
  const plotWidth = VIEW_BOX.width - PAD.left - PAD.right;
  const maxValue = niceCeil(Math.max(1, ...series.flatMap((entry) => entry.data)));
  const toY = (value) => PAD.top + plotHeight - (value / maxValue) * plotHeight;

  const root = svg((node) => {
    node.attr({
      height: 'calc(100% - 30px)',
      role: 'img',
      viewBox: `0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`,
      width: '100%'
    });

    for (let index = 0; index <= 4; index += 1) {
      const ratio = index / 4;
      const lineY = PAD.top + plotHeight * (1 - ratio);
      node.line({
        stroke: index === 0 ? '#cbd5e1' : '#eef1f4',
        'stroke-width': 1,
        x1: PAD.left,
        x2: VIEW_BOX.width - PAD.right,
        y1: lineY,
        y2: lineY
      });
      node.text(String(Math.round(maxValue * ratio)), {
        fill: '#64748b',
        'font-size': 11,
        'text-anchor': 'end',
        x: PAD.left - 8,
        y: lineY + 4
      });
    }

    if (type === 'line') {
      drawLineChart(node, { labels, plotHeight, plotWidth, series, toY });
    } else {
      drawBarChart(node, { labels, plotHeight, plotWidth, series, toY });
    }

    labels.forEach((label, index) => {
      const x =
        type === 'line'
          ? PAD.left + (plotWidth * index) / Math.max(1, labels.length - 1)
          : PAD.left + (plotWidth * (index + 0.5)) / labels.length;
      node.text(label, {
        fill: '#64748b',
        'font-size': 11,
        'text-anchor': 'middle',
        x,
        y: VIEW_BOX.height - 10
      });
    });
  });

  return root;
}

function drawBarChart(node, { labels, plotHeight, plotWidth, series, toY }) {
  const groupWidth = plotWidth / Math.max(1, labels.length);
  const barWidth = Math.min(32, (groupWidth * 0.72) / series.length);
  labels.forEach((label, labelIndex) => {
    const centerX = PAD.left + groupWidth * labelIndex + groupWidth / 2;
    series.forEach((entry, seriesIndex) => {
      const value = entry.data[labelIndex] ?? 0;
      const barX = centerX - (barWidth * series.length) / 2 + barWidth * seriesIndex;
      node.rect({
        fill: entry.color,
        height: PAD.top + plotHeight - toY(value),
        rx: 2,
        width: barWidth,
        x: barX,
        y: toY(value)
      });
    });
  });
}

function drawLineChart(node, { labels, plotHeight, plotWidth, series, toY }) {
  const stepX = plotWidth / Math.max(1, labels.length - 1);
  series.forEach((entry) => {
    const points = entry.data.map((value, index) => `${PAD.left + stepX * index},${toY(value)}`);
    if (points.length > 1) {
      const area = [
        `${PAD.left},${PAD.top + plotHeight}`,
        ...points,
        `${PAD.left + stepX * (points.length - 1)},${PAD.top + plotHeight}`
      ];
      node.polygon({ fill: entry.color, opacity: 0.1, points: area.join(' ') });
    }
    node.polyline({
      fill: 'none',
      points: points.join(' '),
      stroke: entry.color,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': 2
    });
    entry.data.forEach((value, index) => {
      node.circle({
        cx: PAD.left + stepX * index,
        cy: toY(value),
        fill: '#ffffff',
        r: 3,
        stroke: entry.color,
        'stroke-width': 2
      });
    });
  });
}

function niceCeil(value) {
  if (value <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
}
