import { AgGridDemoNode } from './ag-grid-glue.js';

const SPARK_WIDTH = 104;
const SPARK_HEIGHT = 30;

export function AgGridFinanceExample() {
  const seedRows = () => {
    const seeds = [
      ['600519', '贵州茅台', '白酒', 1520, 1568, 860],
      ['300750', '宁德时代', '电池', 205, 198, 2400],
      ['601318', '中国平安', '保险', 52.8, 55.1, 9800],
      ['000858', '五粮液', '白酒', 140, 133.6, 2600],
      ['002594', '比亚迪', '汽车', 268, 281.4, 1800],
      ['600036', '招商银行', '银行', 37.2, 36.8, 7200],
      ['000333', '美的集团', '家电', 63.5, 66.2, 4100],
      ['600900', '长江电力', '公用事业', 26.4, 27.9, 5900]
    ];

    return seeds.map(([code, name, sector, cost, base, shares], index) => {
      const history = Array.from({ length: 24 }, (_, k) => {
        const wave = Math.sin(index * 2.4 + k * 0.7) / 140;
        const drift = (((k * 17 + index * 5) % 9) - 4) / 1000;
        return Math.round(base * (1 + wave + drift) * 100) / 100;
      });
      const last = history[history.length - 1];
      const prev = history[history.length - 2];

      return {
        change: Math.round(((last - prev) / prev) * 10000) / 100,
        code,
        cost,
        history,
        marketValue: Math.round(last * shares),
        name,
        pnl: Math.round((last - cost) * shares),
        prev,
        price: last,
        sector,
        shares
      };
    });
  };

  const fmtPrice = (params) =>
    params.value == null
      ? ''
      : `¥${params.value.toLocaleString('zh-CN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
        })}`;

  const fmtInt = (params) =>
    params.value == null ? '' : params.value.toLocaleString('zh-CN');

  const renderInstrument = (params) => {
    if (params.node?.rowPinned === 'bottom') {
      return '<span class="fin-total">组合持仓合计</span>';
    }
    const data = params.data;
    if (!data || !data.code) {
      return '';
    }
    const tones = ['#2563eb', '#0891b2', '#7c3aed', '#db2777'];
    const tone = tones[data.code.charCodeAt(3) % tones.length];

    return (
      `<span class="fin-ticker">` +
      `<i class="fin-logo" style="background:${tone}">` +
      `${data.name.slice(0, 1)}</i>` +
      `<span class="fin-copy"><b>${data.name}</b>` +
      `<small>${data.code}</small></span></span>`
    );
  };

  const renderChange = (params) => {
    const value = params.value;
    if (value == null) {
      return '';
    }
    const up = value >= 0;
    const cls = up ? 'fin-up' : 'fin-down';
    const arrow = up ? '▲' : '▼';

    return `<span class="${cls}">${arrow} ${Math.abs(value).toFixed(2)}%</span>`;
  };

  const renderSpark = (params) => {
    const values = params.value || [];
    if (values.length < 2) {
      return '';
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const gap = 1.5;
    const barWidth =
      (SPARK_WIDTH - gap * (values.length - 1)) / values.length;
    const bars = values
      .map((value, index) => {
        const barHeight = Math.max(
          2,
          ((value - min) / span) * (SPARK_HEIGHT - 8)
        );
        const x = index * (barWidth + gap);
        const y = SPARK_HEIGHT - 2 - barHeight;
        return (
          `<rect class="fin-bar" x="${x.toFixed(1)}" ` +
          `y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" ` +
          `height="${barHeight.toFixed(1)}" rx="1"/>`
        );
      })
      .join('');

    return (
      '<svg class="fin-spark" ' +
      `width="${SPARK_WIDTH}" height="${SPARK_HEIGHT}" ` +
      `viewBox="0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}">${bars}</svg>`
    );
  };

  const renderPnl = (params) => {
    const value = params.value;
    if (value == null) {
      return '';
    }
    const cls = value >= 0 ? 'fin-up' : 'fin-down';
    const sign = value >= 0 ? '+' : '';

    return (
      `<span class="${cls}">${sign}¥` +
      `${Math.abs(value).toLocaleString('zh-CN')}</span>`
    );
  };

  const summaryRow = () => {
    const marketValue = rows.reduce((sum, row) => sum + row.marketValue, 0);
    const pnl = rows.reduce((sum, row) => sum + row.pnl, 0);
    return { marketValue, pnl };
  };

  const columns = () => [
    {
      cellRenderer: renderInstrument,
      field: 'name',
      headerName: '证券',
      pinned: 'left',
      width: 200
    },
    { field: 'sector', headerName: '类型', width: 100 },
    {
      enableCellChangeFlash: true,
      field: 'price',
      headerName: '现价',
      type: 'numericColumn',
      valueFormatter: fmtPrice,
      width: 120
    },
    {
      cellRenderer: renderChange,
      field: 'change',
      headerName: '涨跌幅',
      type: 'numericColumn',
      width: 120
    },
    {
      cellDataType: false,
      cellRenderer: renderSpark,
      field: 'history',
      headerName: '日内走势',
      sortable: false,
      width: 128
    },
    {
      field: 'shares',
      headerName: '持仓(股)',
      type: 'numericColumn',
      valueFormatter: fmtInt,
      width: 120
    },
    {
      enableCellChangeFlash: true,
      field: 'marketValue',
      headerName: '当前市值',
      type: 'numericColumn',
      valueFormatter: fmtPrice,
      width: 140
    },
    {
      cellRenderer: renderPnl,
      enableCellChangeFlash: true,
      field: 'pnl',
      headerName: '浮动盈亏',
      type: 'numericColumn',
      width: 140
    }
  ];

  let node = null;
  let rows = seedRows();
  let timer = null;
  let tickCount = 0;
  let running = false;

  const tick = () => {
    if (!node) {
      return;
    }
    const rounds = 2 + Math.floor(Math.random() * 3);

    for (let step = 0; step < rounds; step += 1) {
      const index = Math.floor(Math.random() * rows.length);
      const row = rows[index];
      const next = Math.max(1, row.price * (1 + (Math.random() - 0.5) * 0.02));
      row.price = Math.round(next * 100) / 100;
      row.history = [...row.history.slice(1), row.price];
      row.change = Math.round(((row.price - row.prev) / row.prev) * 10000) / 100;
      row.marketValue = Math.round(row.price * row.shares);
      row.pnl = Math.round((row.price - row.cost) * row.shares);
      node.applyTransaction({ update: [row] });
    }
    tickCount += 1;
    node.setGridOption('pinnedBottomRowData', [summaryRow()]);
  };

  const start = () => {
    if (timer || typeof window === 'undefined') {
      return;
    }
    timer = window.setInterval(tick, 650);
    running = true;
  };

  const stop = () => {
    if (!timer || typeof window === 'undefined') {
      return;
    }
    window.clearInterval(timer);
    timer = null;
    running = false;
  };

  return {
    render() {
      node = new AgGridDemoNode({
        columnDefs: columns(),
        height: '440px',
        gridOptions: {
          defaultColDef: { resizable: true, sortable: true },
          getRowId: (params) => String(params.data.code),
          pinnedBottomRowData: [summaryRow()]
        },
        rowData: rows
      });
      start();
      return node;
    },
    start,
    stop,
    tick,
    reset() {
      this.stop();
      rows = seedRows();
      tickCount = 0;
      node?.setRows(rows);
    },
    tickCount() {
      return tickCount;
    },
    running() {
      return running;
    },
    destroy() {
      this.stop();
      node?.destroy();
      node = null;
    }
  };
}
