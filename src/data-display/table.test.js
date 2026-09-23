import { describe, expect, it, vi } from 'vitest';
import { vButton, vTable, vTableWrapper, vTbody, vTd, vTfoot, vTh, vThead, vTr } from '../index.js';

/** 身份走 `vn` 属性（票 15：组件类名退场）。 */
const GRID = '[vn="VTableGrid"]';
const HEAD = '[vn="VThead"]';
const BODY = '[vn="VTbody"]';
const FOOT = '[vn="VTfoot"]';
const CAPTION = '[vn="VTableCaption"]';

describe('vTable declarative sections', () => {
  it('builds thead, tbody and tfoot through vTable child shortcuts', () => {
    const table = vTable((table) => {
      table.caption('服务列表');
      table.vThead((head) => {
        head.vTr((row) => {
          row.vTh('名称');
          row.vTh('状态');
        });
      });
      table.vTbody((body) => {
        body.vTr((row) => {
          row.vTd('api-gateway');
          row.vTd('运行中');
        });
      });
      table.vTfoot((foot) => {
        foot.vTr((row) => {
          row.vTd((cell) => {
            cell.attr('colspan', 2);
            cell.child('共 1 条');
          });
        });
      });
    });

    const element = table.renderDom();
    const tableElement = element.querySelector(GRID);

    expect(tableElement.querySelectorAll(':scope > thead')).toHaveLength(1);
    expect(tableElement.querySelectorAll(':scope > tbody')).toHaveLength(1);
    expect(tableElement.querySelectorAll(':scope > tfoot')).toHaveLength(1);
    expect(tableElement.querySelector(`${HEAD} th:nth-child(1)`).textContent).toBe('名称');
    expect(tableElement.querySelector(`${BODY} td:nth-child(2)`).textContent).toBe('运行中');
    expect(tableElement.querySelector(`${FOOT} td`).getAttribute('colspan')).toBe('2');
    expect(tableElement.querySelector(CAPTION).textContent).toBe('服务列表');
  });

  it('exposes standalone section, row and cell factories', () => {
    const head = vThead((head) =>
      head.vTr((row) => {
        row.vTh('名称');
        row.vTh('状态');
      })
    );
    const body = vTbody((body) => body.vTr((row) => row.vTd('api-gateway').vTd('运行中')));
    const foot = vTfoot((foot) => foot.vTr((row) => row.vTd('合计')));

    expect(head.tagName()).toBe('thead');
    expect(head.renderDom().querySelector('th:nth-child(2)').textContent).toBe('状态');
    expect(body.renderDom().querySelector('td:nth-child(1)').textContent).toBe('api-gateway');
    expect(foot.renderDom().querySelector('td').textContent).toBe('合计');
    expect(vTh('名称').textContent()).toBe('名称');
    expect(vTd('值').attr('vn')).toBe('VTd');
    expect(vTh('名称').attr('vn')).toBe('VTh');
    expect(vTr('一行').tagName()).toBe('tr');
  });

  it('keeps declarative rows in the body when vTable.vTr is used directly', () => {
    const table = vTable((table) => {
      table.vThead((head) => head.vTr((row) => row.vTh('名称')));
      table.vTr((row) => row.vTd('api-gateway'));
    });

    const element = table.renderDom();

    expect(element.querySelector(`${BODY} td`).textContent).toBe('api-gateway');
    expect(element.querySelectorAll(`${GRID} > tbody`)).toHaveLength(1);
  });

  it('routes child sections into the internal table element', () => {
    const table = vTable((table) => {
      table.child(vThead((head) => head.vTr((row) => row.vTh('名称'))));
      table.child(vTbody((body) => body.vTr((row) => row.vTd('api-gateway'))));
    });
    const element = table.renderDom();

    expect(element.querySelector(`${GRID} > thead th`).textContent).toBe('名称');
    expect(element.querySelector(`${GRID} > tbody td`).textContent).toBe('api-gateway');
  });

  it('keeps rows handed to child() in the anonymous table slot', () => {
    const table = vTable((table) => {
      table.child(vTr((row) => row.vTd('api-gateway')));
    });
    const element = table.renderDom();
    const grid = element.querySelector(GRID);

    // 匿名占位就是 <table>：行落在它里面（与段命令混用不是这套写法）
    expect(grid.querySelectorAll(':scope > [vn="VTr"]')).toHaveLength(1);
    expect(grid.querySelector(':scope > [vn="VTr"] td').textContent).toBe('api-gateway');
  });

  it('rejects the data-driven keys instead of writing them as attributes', () => {
    expect(() => vTable({ columns: [{ key: 'name' }], rows: [{ name: 'api-gateway' }] })).toThrow(
      /vTableWrapper/
    );
  });

  it('takes caption / sections / row through props and keeps the rest on the shell', () => {
    const table = vTable({
      attrs: { id: 'props-table' },
      caption: '季度报表',
      style: { maxWidth: '240px' },
      vThead: (head) => head.vTr((row) => row.vTh('名称')),
      vTbody: (body) => body.vTr((row) => row.vTd('api-gateway')),
      vTfoot: (foot) => foot.vTr((row) => row.vTd('合计')),
      vTr: (row) => row.vTd('追加行')
    });
    const element = table.renderDom();
    const grid = element.querySelector(GRID);

    // 其余键 = 元素 options，落在视图根（壳）上
    expect(element.id).toBe('props-table');
    expect(element.style.maxWidth).toBe('240px');
    // 自己的键 = 段 / 行，落在 <table> 里
    expect(grid.querySelector(CAPTION).textContent).toBe('季度报表');
    expect(grid.querySelector(`${HEAD} th`).textContent).toBe('名称');
    expect(grid.querySelectorAll(`${BODY} tr`)).toHaveLength(2);
    expect(grid.querySelector(`${BODY} tr td`).textContent).toBe('api-gateway');
    expect(grid.querySelector(`${FOOT} td`).textContent).toBe('合计');
  });

  it('shares one part instance between props and commands', () => {
    const table = vTable({ caption: '甲' });

    table.caption('乙');
    const element = table.renderDom();

    // props 建过一次，命令复用同一份（不是两份标题）——DOM 是用户可见的真源
    expect(element.querySelectorAll(CAPTION)).toHaveLength(1);
    expect(element.querySelector(CAPTION).textContent).toBe('乙');
    // 注：`table.caption()` 这条**读**回路径在"写过两次"之后会把旧文本一起返回（DOM 是对的）——
    // 既有问题，见 16 号清单第 73 条，与本次 props 改造无关，单独一刀修。
  });

  it('keeps the positional callback and the props in one call', () => {
    const table = vTable({ caption: '报表' }, (table) => {
      table.vTbody((body) => body.vTr((row) => row.vTd('api-gateway')));
    });
    const element = table.renderDom();

    expect(element.querySelector(CAPTION).textContent).toBe('报表');
    expect(element.querySelector(`${BODY} td`).textContent).toBe('api-gateway');
  });

  it('keeps the props parts and the anonymous child() content in declaration order', () => {
    const table = vTable({ caption: '报表' }, (table) => {
      table.child(vTr((row) => row.vTd('api-gateway')));
    });
    const grid = table.renderDom().querySelector(GRID);

    // 段挂在 <table> 句柄上，匿名 child() 走组件的匿名占位（= 同一个 <table>），顺序按声明
    expect([...grid.children].map((child) => child.getAttribute('vn'))).toEqual([
      'VTableCaption',
      'VTr'
    ]);
  });

  it('mounts sections on demand instead of building them inside commands', () => {
    const table = vTable();
    const grid = table.renderDom().querySelector(GRID);

    // 没用到就不在 DOM 里（部件常驻视图树，`mountable` 决定挂不挂）
    expect(table.renderDom().querySelector(CAPTION)).toBeNull();
    expect(grid.querySelectorAll(':scope > thead, :scope > tbody, :scope > tfoot')).toHaveLength(0);

    table.vThead((head) => head.vTr((row) => row.vTh('名称')));
    expect(grid.querySelector(`${HEAD} th`).textContent).toBe('名称');

    // 后写的标题仍然排在表头前面：位置由结构定，不看调用顺序
    table.caption('报表');
    expect([...grid.children].map((child) => child.getAttribute('vn'))).toEqual([
      'VTableCaption',
      'VThead'
    ]);
  });

  it('takes a bare string as the caption', () => {
    const table = vTable('季度报表');

    expect(table.renderDom().querySelector(CAPTION).textContent).toBe('季度报表');
  });
});

describe('vTableWrapper data-driven table', () => {
  const columns = [
    { key: 'name', label: '名称', minWidth: 160 },
    { key: 'status', label: '状态', align: 'right', width: 90 }
  ];

  it('builds the head from columns and the body from rows', () => {
    const wrapper = vTableWrapper({
      caption: '服务列表',
      columns,
      rows: [{ id: 'gateway', name: 'api-gateway', status: '运行中' }]
    });

    const element = wrapper.renderDom();
    const headCells = element.querySelectorAll(`${HEAD} th`);
    const bodyRow = element.querySelector(`${BODY} tr`);

    expect(element.querySelector(CAPTION).textContent).toBe('服务列表');
    expect([...headCells].map((cell) => cell.textContent)).toEqual(['名称', '状态']);
    expect(headCells[0].getAttribute('data-key')).toBe('name');
    expect(headCells[0].style.minWidth).toBe('160px');
    expect(headCells[1].style.textAlign).toBe('right');
    expect(bodyRow.getAttribute('data-row-key')).toBe('gateway');
    expect([...bodyRow.querySelectorAll('td')].map((cell) => cell.textContent)).toEqual([
      'api-gateway',
      '运行中'
    ]);
  });

  it('renders custom cells through column.render and exposes per-row state', () => {
    const picked = vi.fn();
    const wrapper = vTableWrapper({
      columns: [
        { key: 'name', label: '名称' },
        {
          key: 'actions',
          label: '操作',
          render: (row) =>
            vButton('选择', (button) => {
              button.size('small');
              button.on('click', () => picked(row.id));
            })
        }
      ],
      rows: [{ id: 'gateway', name: 'api-gateway' }]
    });

    const element = wrapper.renderDom();
    const actionCell = element.querySelector(`${BODY} td[data-key="actions"]`);
    const row = actionCell.closest('tr');

    actionCell.querySelector('button').click();
    expect(picked).toHaveBeenCalledWith('gateway');

    wrapper.item('gateway').api.select();
    expect(row.classList.contains('is-selected')).toBe(true);
    expect(element.querySelector(`${BODY} tr`)).toBe(row);
  });

  it('shows the empty row until rows arrive and clears back to it', () => {
    const wrapper = vTableWrapper({
      columns,
      emptyText: '暂无匹配服务',
      rows: []
    });
    const element = wrapper.renderDom();
    const emptyCell = element.querySelector(`${BODY} td`);

    expect(emptyCell.textContent).toBe('暂无匹配服务');
    expect(emptyCell.getAttribute('colspan')).toBe('2');

    wrapper.rows([{ id: 'gateway', name: 'api-gateway', status: '运行中' }]);
    expect(element.querySelector(`${BODY} tr`).getAttribute('data-row-key')).toBe('gateway');
    expect(element.querySelector(`${BODY} td`).textContent).toBe('api-gateway');

    wrapper.clearRows();
    expect(element.querySelector(`${BODY} td`).textContent).toBe('暂无匹配服务');
  });

  it('infers columns from row data when none are declared', () => {
    const wrapper = vTableWrapper({ rows: [{ id: 'gateway', name: 'api-gateway', owner: 'SRE' }] });
    const element = wrapper.renderDom();

    expect([...element.querySelectorAll(`${HEAD} th`)].map((cell) => cell.textContent)).toEqual([
      'id',
      'name',
      'owner'
    ]);
    expect(element.querySelector(`${BODY} td[data-key="owner"]`).textContent).toBe('SRE');
  });

  it('keeps identity-less rows working in order', () => {
    const wrapper = vTableWrapper({
      columns: [
        { key: 'name', label: '名称' },
        { key: 'status', label: '状态' }
      ]
    });
    const element = wrapper.renderDom();

    wrapper.rows([
      { name: 'api-gateway', status: '运行中' },
      { name: 'worker', status: '停止' }
    ]);

    const bodyRows = element.querySelectorAll(`${BODY} tr`);
    expect(bodyRows).toHaveLength(2);
    expect(bodyRows[1].querySelector('td').textContent).toBe('worker');
  });

  it('falls back to a single value column for rows without columns', () => {
    const wrapper = vTableWrapper({ rows: ['甲', '乙'] });
    const element = wrapper.renderDom();

    expect(element.querySelector(`${HEAD} th`)).toBeNull();
    expect([...element.querySelectorAll(`${BODY} td`)].map((cell) => cell.textContent)).toEqual([
      '甲',
      '乙'
    ]);
    expect(element.querySelector(`${BODY} td`).getAttribute('data-key')).toBe('__value');
  });

  it('rebuilds the affected cells when columns or row data change', () => {
    const wrapper = vTableWrapper({
      columns: [{ key: 'name', label: '名称' }],
      rows: [{ id: 'gateway', name: 'api-gateway' }]
    });
    const element = wrapper.renderDom();

    wrapper.columns([
      { key: 'name', label: '服务名称' },
      { key: 'owner', label: '负责人' }
    ]);
    expect([...element.querySelectorAll(`${HEAD} th`)].map((cell) => cell.textContent)).toEqual([
      '服务名称',
      '负责人'
    ]);

    wrapper.updateRow('gateway', { owner: 'SRE' });
    expect(element.querySelector(`${BODY} td[data-key="owner"]`).textContent).toBe('SRE');
    expect(element.querySelector(`${BODY} tr`).getAttribute('data-row-key')).toBe('gateway');
  });

  it('takes a rowKey handler for rows without their own identity', () => {
    const wrapper = vTableWrapper({
      columns: [{ key: 'name', label: '名称' }],
      rowKey: (row) => row.name,
      rows: [{ name: 'api-gateway' }]
    });
    const element = wrapper.renderDom();

    expect(element.querySelector(`${BODY} tr`).getAttribute('data-row-key')).toBe('api-gateway');
  });
});
