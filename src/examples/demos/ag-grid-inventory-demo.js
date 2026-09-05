import { HtmlElementNode } from '../../index.js';
import { AgGridDemoNode } from './ag-grid-glue.js';

export function AgGridInventoryExample() {
  const variant = (sku, label, available, price, year = 2025) => ({
    available,
    country: '中国大陆',
    label,
    price,
    sku,
    year
  });
  const product = (id, name, category, price, stock, status, variants) => ({
    category,
    id,
    name,
    price,
    status,
    stock,
    variants
  });

  const seedProducts = () => [
    product('P-1001', '皓月 15 轻薄本', '笔记本', 6499, 86, '在售', [
      variant('H15-16-512', '16G + 512G · 深空灰', 38, 6499),
      variant('H15-32-1T', '32G + 1T · 月光银', 48, 7999)
    ]),
    product('P-1002', '星曜 Pro 16 性能本', '笔记本', 9999, 12, '已暂停', [
      variant('X16-32-1T', '32G + 1T · 曜石黑', 12, 9999)
    ]),
    product('P-1003', '云帆 Air 13 轻办公本', '笔记本', 4299, 0, '缺货', [
      variant('A13-8-512', '8G + 512G · 樱花粉', 0, 4299),
      variant('A13-16-512', '16G + 512G · 雾灰', 0, 4799)
    ]),
    product('P-2001', '观澜 27 英寸 4K 显示器', '显示器', 2399, 156, '在售', [
      variant('M27-4K', '4K IPS · 银黑', 96, 2399),
      variant('M27-4K-W', '4K IPS · 皓白', 60, 2499)
    ]),
    product('P-2002', '观澜 34 英寸带鱼屏', '显示器', 3299, 0, '缺货', [
      variant('M34-UW', '3440×1440 · 曲面', 0, 3299)
    ]),
    product('P-3001', '疾风 三模机械键盘', '键鼠外设', 499, 240, '在售', [
      variant('KB87-RE', '87 键 · 烈焰红轴', 130, 499),
      variant('KB87-BL', '87 键 · 冰晶蓝轴', 110, 499)
    ]),
    product('P-3002', '静音无线鼠标', '键鼠外设', 199, 4, '已暂停', [
      variant('MS-SW', '2.4G 无线 · 深空灰', 4, 199)
    ]),
    product('P-4001', '回声 头戴降噪耳机', '影音设备', 899, 320, '在售', [
      variant('HP-NC', '主动降噪 · 曜黑', 170, 899),
      variant('HP-NC-W', '主动降噪 · 米白', 150, 899)
    ]),
    product('P-4002', '低音蓝牙音箱', '影音设备', 399, 0, '缺货', [
      variant('SP-BT', '便携防水 · 深灰', 0, 399)
    ]),
    product('P-5001', '灵犀 智能手表', '智能穿戴', 1299, 74, '在售', [
      variant('WT-46', '46mm 表盘 · 石墨黑', 45, 1299),
      variant('WT-42', '42mm 表盘 · 星光银', 29, 1199)
    ]),
    product('P-5002', '65W 氮化镓充电器', '数码配件', 149, 0, '缺货', [
      variant('PD65-2C', '双 Type-C · 白色', 0, 149)
    ]),
    product('P-5003', '笔记本铝合金支架', '数码配件', 199, 60, '已暂停', [
      variant('ST-AL', '六档调节 · 银色', 60, 199)
    ])
  ];

  const products = seedProducts();
  const state = { status: '全部' };
  let master = null;
  let detail = null;

  const filteredRows = () =>
    state.status === '全部'
      ? products
      : products.filter((item) => item.status === state.status);

  const refreshMaster = () => master?.setRows(filteredRows());

  const fmtPrice = (params) => `¥${params.value.toLocaleString('zh-CN')}`;

  const renderProduct = (params) => {
    const data = params.data;
    const tones = {
      键鼠外设: '#2563eb',
      数码配件: '#0891b2',
      显示器: '#7c3aed',
      影音设备: '#db2777',
      智能穿戴: '#ea580c',
      笔记本: '#16a34a'
    };
    const tone = tones[data.category] || '#64748b';

    return (
      `<span class="inv-product"><i class="inv-tile" ` +
      `style="background:${tone}">${data.name.slice(0, 1)}</i>` +
      `<span class="inv-copy"><b>${data.name}</b>` +
      `<small>${data.category}</small></span></span>`
    );
  };

  const renderStatus = (params) => {
    const value = params.value;
    if (!value) {
      return '';
    }
    const tone =
      value === '在售' ? 'sale' : value === '已暂停' ? 'pause' : 'empty';

    return `<span class="inv-status inv-status-${tone}"><i></i>${value}</span>`;
  };

  const renderStock = (params) => {
    const value = params.value;
    const ratio = Math.min(value / 80, 1);
    const cls = value <= 0 ? 'empty' : value < 15 ? 'low' : 'ok';

    return (
      `<span class="inv-stock inv-stock-${cls}">` +
      `<span class="inv-stock-text">${value} 件</span>` +
      `<span class="inv-stock-bar"><i ` +
      `style="width:${Math.round(ratio * 100)}%"></i></span></span>`
    );
  };

  const pause = (id) => {
    const item = products.find((row) => row.id === id);
    if (item) {
      item.status = '已暂停';
    }
    refreshMaster();
  };

  const resume = (id) => {
    const item = products.find((row) => row.id === id);
    if (item) {
      item.status = '在售';
    }
    refreshMaster();
  };

  const restock = (id) => {
    const item = products.find((row) => row.id === id);
    if (!item) {
      return;
    }
    item.status = '在售';
    item.stock = 36;
    item.variants.forEach((variantItem, index) => {
      variantItem.available = 12 + index * 8;
    });
    refreshMaster();
  };

  const remove = (id) => {
    const index = products.findIndex((row) => row.id === id);
    if (index >= 0) {
      products.splice(index, 1);
    }
    refreshMaster();
  };

  const showDetail = (item) => {
    if (!item || !item.variants) {
      return;
    }
    detail?.setRows(item.variants);
    detail?.setVisible(true);
  };

  const actionsRenderer = () => (params) => {
    const row = params.data;
    const wrap = document.createElement('span');
    wrap.className = 'inv-actions';

    const main = document.createElement('button');
    main.className = 'inv-action';
    main.type = 'button';
    if (row.status === '在售') {
      main.textContent = '暂停销售';
      main.addEventListener('click', () => pause(row.id));
    } else if (row.status === '已暂停') {
      main.textContent = '恢复销售';
      main.addEventListener('click', () => resume(row.id));
    } else {
      main.textContent = '一键补货';
      main.addEventListener('click', () => restock(row.id));
    }

    const removeButton = document.createElement('button');
    removeButton.className = 'inv-action inv-action-danger';
    removeButton.textContent = '删除';
    removeButton.type = 'button';
    removeButton.addEventListener('click', () => remove(row.id));
    wrap.append(main, removeButton);
    return wrap;
  };

  const masterColumns = () => [
    {
      cellRenderer: renderProduct,
      field: 'name',
      headerName: '商品',
      pinned: 'left',
      sortable: false,
      width: 290
    },
    { field: 'id', headerName: '货号', width: 110 },
    {
      field: 'price',
      headerName: '单价',
      type: 'numericColumn',
      valueFormatter: fmtPrice,
      width: 120
    },
    {
      cellRenderer: renderStock,
      field: 'stock',
      headerName: '库存',
      sortable: false,
      width: 190
    },
    {
      cellRenderer: renderStatus,
      field: 'status',
      headerName: '状态',
      width: 120
    },
    {
      cellRenderer: actionsRenderer(),
      field: 'actions',
      headerName: '操作',
      sortable: false,
      width: 200
    }
  ];

  const detailColumns = () => [
    { field: 'sku', headerName: 'SKU', width: 130 },
    { field: 'label', headerName: '规格 / 颜色', width: 260 },
    {
      field: 'available',
      headerName: '可售库存',
      type: 'numericColumn',
      width: 120
    },
    {
      field: 'price',
      headerName: '单价',
      type: 'numericColumn',
      valueFormatter: fmtPrice,
      width: 120
    },
    { field: 'year', headerName: '年份', width: 90 },
    { field: 'country', headerName: '销售区域', width: 130 }
  ];

  return {
    render() {
      master = new AgGridDemoNode({
        columnDefs: masterColumns(),
        height: '330px',
        gridOptions: {
          defaultColDef: { resizable: true, sortable: true },
          getRowId: (params) => String(params.data.id),
          onRowClicked: (params) => showDetail(params.data),
          pagination: true,
          paginationPageSize: 10,
          paginationPageSizeSelector: [10, 20, 50],
          rowHeight: 64
        },
        rowData: filteredRows()
      });
      detail = new AgGridDemoNode({
        columnDefs: detailColumns(),
        height: '210px',
        gridOptions: { defaultColDef: { resizable: true } },
        hidden: true,
        rowData: []
      });

      const host = new HtmlElementNode('div');
      host.styles({
        display: 'grid',
        gap: '10px',
        minWidth: '0',
        width: '100%'
      });
      host.child(master, detail);
      return host;
    },
    setStatus(status) {
      state.status = status;
      refreshMaster();
    },
    countOf(status) {
      if (status === '全部') {
        return products.length;
      }
      return products.filter((item) => item.status === status).length;
    },
    status() {
      return state.status;
    },
    destroy() {
      master?.destroy();
      master = null;
      detail?.destroy();
      detail = null;
    }
  };
}
