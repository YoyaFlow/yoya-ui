import { AgGridDemoNode } from './ag-grid-glue.js';

export function AgGridHrExample() {
  const person = (id, name, title, empType, location, joinDate, salary, status) => ({
    empType,
    id,
    joinDate,
    kind: 'person',
    location,
    name,
    salary,
    status,
    title
  });
  const group = (id, name, children) => ({ children, id, kind: 'group', name });

  const tree = () => [
    group('rd', '研发中心', [
      group('rd-fe', '平台前端组', [
        person('rd-fe-1', '林晚', '前端工程师', '全职', '上海', '2021-03-15', 24000, '已发放'),
        person('rd-fe-2', '周屿', '资深前端', '全职', '杭州', '2019-08-01', 32000, '已发放'),
        person('rd-fe-3', '王珂', '前端负责人', '全职', '上海', '2018-04-10', 42000, '待发放')
      ]),
      group('rd-be', '服务端组', [
        person('rd-be-1', '陈默', '后端工程师', '全职', '上海', '2020-11-02', 26000, '已发放'),
        person('rd-be-2', '苏芮', '资深后端', '全职', '杭州', '2017-06-19', 38000, '待发放'),
        person('rd-be-3', '赵一鸣', '架构师', '全职', '北京', '2016-02-22', 52000, '已发放')
      ]),
      group('rd-ds', '数据与算法组', [
        person('rd-ds-1', '何倩', '数据分析师', '实习', '上海', '2024-06-03', 8000, '已发放'),
        person('rd-ds-2', '高远', '算法工程师', '全职', '深圳', '2021-12-13', 36000, '待发放')
      ])
    ]),
    group('pd', '产品与设计中心', [
      group('pd-pm', '产品管理组', [
        person('pd-pm-1', '罗思', '产品经理', '全职', '北京', '2019-09-09', 30000, '已发放'),
        person('pd-pm-2', '邓雪', '产品经理', '全职', '上海', '2022-04-18', 26000, '已发放')
      ]),
      group('pd-ux', '体验设计组', [
        person('pd-ux-1', '程岚', '交互设计师', '全职', '杭州', '2020-07-27', 24000, '待发放'),
        person('pd-ux-2', '沈星', '视觉设计师', '全职', '上海', '2021-10-11', 25000, '已发放')
      ])
    ]),
    group('sm', '销售与市场中心', [
      group('sm-hd', '华东销售组', [
        person('sm-hd-1', '黄蓉', '销售总监', '全职', '上海', '2015-05-06', 55000, '已发放'),
        person('sm-hd-2', '郭靖', '大客户经理', '全职', '上海', '2018-12-24', 28000, '待发放'),
        person('sm-hd-3', '杨帆', '渠道经理', '全职', '杭州', '2020-03-02', 22000, '已发放')
      ]),
      group('sm-mkt', '市场增长组', [
        person('sm-mkt-1', '唐糖', '增长运营', '全职', '北京', '2021-01-25', 20000, '已发放'),
        person('sm-mkt-2', '白露', '品牌策划', '合同', '上海', '2023-08-14', 21000, '已发放')
      ])
    ]),
    group('ops', '职能与运营中心', [
      group('ops-hr', '人力资源组', [
        person('ops-hr-1', '顾云', 'HRBP', '全职', '上海', '2019-05-20', 23000, '已发放'),
        person('ops-hr-2', '韩雪', '招聘专员', '全职', '杭州', '2022-09-05', 16000, '待发放')
      ]),
      group('ops-fa', '财务与法务组', [
        person('ops-fa-1', '江澈', '财务经理', '全职', '上海', '2017-03-27', 34000, '已发放'),
        person('ops-fa-2', '秦朗', '法务顾问', '全职', '北京', '2020-08-17', 30000, '已发放')
      ])
    ])
  ];

  const roots = tree();
  const expanded = new Set();
  let node = null;

  const visitGroups = (visit) => {
    const walk = (item) => {
      if (item.kind === 'person') {
        return;
      }
      visit(item);
      item.children.forEach(walk);
    };
    roots.forEach(walk);
  };

  visitGroups((item) => expanded.add(item.id));

  const count = (item) =>
    item.kind === 'person'
      ? 1
      : item.children.reduce((sum, child) => sum + count(child), 0);

  const flatten = (out = [], item, depth = 0, department = '公司') => {
    const isGroup = item.kind === 'group';
    const isExpanded = isGroup && expanded.has(item.id);
    const row = isGroup
      ? {
          count: count(item),
          department,
          depth,
          expanded: isExpanded,
          id: item.id,
          kind: 'group',
          name: item.name
        }
      : { ...item, department, depth };
    out.push(row);

    if (!isGroup || !isExpanded) {
      return out;
    }
    item.children.forEach((child) => {
      const childDepartment = child.kind === 'group' ? child.name : item.name;
      flatten(out, child, depth + 1, childDepartment);
    });
    return out;
  };

  const visibleRows = () => roots.reduce((out, item) => flatten(out, item), []);

  const toggle = (id) => {
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    node?.setRows(visibleRows());
  };

  const memberRenderer = () => (params) => {
    const row = params.data;
    const wrap = document.createElement('span');
    wrap.className = 'hr-member';
    wrap.style.paddingLeft = `${12 + row.depth * 20}px`;

    if (row.kind === 'group') {
      const caret = document.createElement('button');
      caret.className = 'hr-caret';
      caret.type = 'button';
      caret.textContent = row.expanded ? '▾' : '▸';
      caret.addEventListener('click', () => toggle(row.id));

      const label = document.createElement('span');
      label.className = 'hr-group';
      label.innerHTML = `<b>${row.name}</b><small>${row.count} 名成员</small>`;
      wrap.append(caret, label);
      return wrap;
    }

    const avatar = document.createElement('i');
    avatar.className = 'hr-avatar';
    avatar.textContent = row.name.slice(0, 1);
    const copy = document.createElement('span');
    copy.className = 'hr-copy';
    copy.innerHTML = `<b>${row.name}</b><small>${row.title}</small>`;
    wrap.append(avatar, copy);
    return wrap;
  };

  const fmtSalary = (params) =>
    params.value == null
      ? ''
      : `¥${params.value.toLocaleString('zh-CN')}`;

  const renderStatus = (params) => {
    const value = params.value;
    if (!value) {
      return '';
    }
    const tone =
      value === '已发放' ? 'paid' : value === '待发放' ? 'pending' : 'overdue';

    return `<span class="hr-status hr-status-${tone}"><i></i>${value}</span>`;
  };

  const renderContact = (params) =>
    params.data.kind === 'group'
      ? ''
      : `<span class="hr-contact">✉ ${params.data.id}@yoya.dev</span>`;

  const columns = () => [
    {
      cellRenderer: memberRenderer(),
      field: 'name',
      headerName: '成员',
      sortable: false,
      width: 300
    },
    { field: 'id', headerName: '工号', width: 110 },
    { field: 'department', headerName: '部门', width: 150 },
    { field: 'empType', headerName: '用工类型', width: 110 },
    { field: 'location', headerName: '办公地', width: 100 },
    { field: 'joinDate', headerName: '入职日期', width: 130 },
    {
      field: 'salary',
      headerName: '月薪',
      type: 'numericColumn',
      valueFormatter: fmtSalary,
      width: 130
    },
    {
      cellRenderer: renderStatus,
      field: 'status',
      headerName: '发薪状态',
      width: 130
    },
    {
      cellRenderer: renderContact,
      field: 'contact',
      headerName: '联系方式',
      width: 170
    }
  ];

  return {
    render() {
      node = new AgGridDemoNode({
        columnDefs: columns(),
        height: '520px',
        gridOptions: {
          defaultColDef: { resizable: true, sortable: true },
          getRowHeight: () => 52,
          getRowId: (params) => String(params.data.id),
          getRowStyle: (params) => {
            if (params.data.kind === 'group') {
              return { background: 'var(--ag-header-background-color)' };
            }
            return undefined;
          }
        },
        rowData: visibleRows()
      });
      return node;
    },
    toggleGroup(id) {
      toggle(id);
    },
    expandAll() {
      visitGroups((item) => expanded.add(item.id));
      node?.setRows(visibleRows());
    },
    collapseAll() {
      expanded.clear();
      node?.setRows(visibleRows());
    },
    visibleCount() {
      return visibleRows().length;
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
