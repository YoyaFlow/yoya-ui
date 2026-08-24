import { codeBlock, vButton, vCard, vChart, vPagination, vTable, vText } from '../../index.js';

export function ServiceDetailCard({ toast }) {
  const serviceState = vText('运行中');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('详情面板');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vDetail 将 label/value 结构集中到一个组件里，适合只读信息展示。');
            stack.vDetail((detail) => {
              detail.vDetailItem((item) => {
                item.label('名称');
                item.value('示例服务');
              });
              detail.vDetailItem((item) => {
                item.label('状态');
                item.value(serviceState);
              });
              detail.vDetailItem('负责人', '示例团队');
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('切换状态');
            button.on('click', () => {
              serviceState.textContent(
                serviceState.textContent() === '运行中' ? '维护中' : '运行中'
              );
              toast.info(`状态已切换为 ${serviceState.textContent()}`, { duration: 0 });
            });
          });
        });
      });
    }
  };
}

export function SqlSnippetCard() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('代码片段');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vCode 内置复制按钮，适合 SQL、配置和短代码片段。');
            stack.vCode((code) => {
              code.language('sql');
              code.content('SELECT id, name, state FROM records ORDER BY updated_at DESC;');
            });
          });
        });
      });
    }
  };
}

export function CodeBlockCard() {
  const logBlock = codeBlock({
    content:
      '2026-08-20T12:00:00Z level=error request_id=api-42 status=timeout\n' +
      '2026-08-20T12:00:01Z level=info request_id=api-42 retry=1',
    copyLabel: '复制日志',
    language: 'log'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('日志代码块');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('CodeBlock 复用 vCode，并提供适合文档、SQL 和长日志的快捷入口。');
            stack.child(logBlock);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.id('code-block-update');
            button.label('更新日志');
            button.on('click', () => {
              logBlock.content(
                '2026-08-20T12:00:02Z level=info request_id=api-42 status=recovered'
              );
            });
          });
        });
      });
    }
  };
}

export function ServiceTableCard({ toast }) {
  const services = [
    { name: '样本 A', status: '运行中', owner: '示例组' },
    { name: '样本 B', status: '空闲', owner: '平台组' }
  ];

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('表格操作');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vTable 可以把列定义、空状态和行操作收拢在一个组件里。');
            stack.vTable((table) => {
              table.caption('示例数据');
              table.columns([
                { key: 'name', label: '名称' },
                { key: 'status', label: '状态' },
                { key: 'owner', label: '负责人' },
                {
                  key: 'actions',
                  label: '操作',
                  align: 'right',
                  render: (row) =>
                    vButton((button) => {
                      button.label(row.status === '运行中' ? '查看' : '处理');
                      button.variant('secondary');
                      button.size('small');
                      button.on('click', () => {
                        toast.info(`菜单触发：${row.name}`, { duration: 0 });
                      });
                    })
                }
              ]);
              table.rows(services);
              table.emptyText('暂无服务');
            });
          });
        });
      });
    }
  };
}

export function PagedServiceTableCard() {
  const services = [
    { name: '样本 1', status: '运行中', owner: '示例组' },
    { name: '样本 2', status: '运行中', owner: '平台组' },
    { name: '样本 3', status: '维护中', owner: '平台组' },
    { name: '样本 4', status: '空闲', owner: '数据组' },
    { name: '样本 5', status: '运行中', owner: '财务组' },
    { name: '样本 6', status: '维护中', owner: '平台组' },
    { name: '样本 7', status: '运行中', owner: '搜索组' },
    { name: '样本 8', status: '空闲', owner: '示例组' },
    { name: '样本 9', status: '运行中', owner: '安全组' },
    { name: '样本 10', status: '运行中', owner: '平台组' },
    { name: '样本 11', status: '维护中', owner: '数据组' },
    { name: '样本 12', status: '空闲', owner: '财务组' }
  ];
  const state = { page: 1, pageSize: 4 };
  const table = vTable({
    caption: '分页服务',
    columns: [
      { key: 'name', label: '名称' },
      { key: 'status', label: '状态' },
      { key: 'owner', label: '负责人' }
    ],
    emptyText: '暂无服务'
  });
  const pagination = vPagination({
    onChange({ page, pageSize }) {
      state.page = page;
      state.pageSize = pageSize;
      syncPage();
    },
    pageSize: state.pageSize,
    pageSizes: [4, 6]
  });

  function syncPage() {
    const total = services.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const currentPage = Math.min(Math.max(1, state.page), totalPages);
    const start = (currentPage - 1) * state.pageSize;

    state.page = currentPage;
    table.rows(services.slice(start, start + state.pageSize));
    pagination.update({
      page: currentPage,
      pageSize: state.pageSize,
      total,
      totalPages
    });
  }

  syncPage();

  return {
    render() {
      return vCard((card) => {
        card.attr('data-demo-card', 'paged-service-table');
        card.vCardHeader('分页表格');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vPagination 可以驱动 vTable 的当前页切片，页面只负责同步状态和查询结果。');
            stack.child(table);
            stack.child(pagination);
          });
        });
      });
    }
  };
}

export function ChartAdapterCard() {
  let values = [42, 58, 36];
  const adapter = {
    init(host, context) {
      host.classList.add('chart-adapter-host');
      const instance = { host };
      this.update(instance, context);
      return instance;
    },
    update(instance, context) {
      instance.host.replaceChildren();
      context.data.forEach((value, index) => {
        const bar = document.createElement('span');
        bar.dataset.chartBar = String(index);
        bar.textContent = String(value);
        bar.style.height = `${value}px`;
        bar.style.width = '28px';
        bar.style.background = '#1f6feb';
        bar.style.color = '#fff';
        bar.style.display = 'inline-flex';
        bar.style.alignItems = 'flex-end';
        bar.style.justifyContent = 'center';
        instance.host.appendChild(bar);
      });
    },
    resize(instance, context) {
      instance.host.dataset.chartHeight = String(context.height ?? 'auto');
    },
    destroy(instance) {
      instance.host.replaceChildren();
    }
  };
  const chart = vChart({ adapter, data: values, height: 180 });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('图表宿主');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vChart 只提供宿主和生命周期，具体绘制逻辑由适配器负责。');
            stack.child(chart);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.id('chart-adapter-update');
            button.label('更新数据');
            button.on('click', () => {
              values = [64, 48, 72, 84];
              chart.data(values);
            });
          });
          footer.vButton((button) => {
            button.id('chart-adapter-resize');
            button.label('调整高度');
            button.on('click', () => chart.resize(undefined, 240));
          });
        });
      });
    }
  };
}

export const dataDisplayCategory = {
  description: '详情面板、代码片段、表格、分页与图表宿主。',
  id: 'data-display',
  title: '数据展示',
  demos: [
    {
      component: ServiceDetailCard,
      imports: ['vCard', 'vText'],
      title: '详情面板核心源码'
    },
    { component: SqlSnippetCard, imports: ['vCard'], title: '代码片段核心源码' },
    {
      component: CodeBlockCard,
      imports: ['codeBlock', 'vCard'],
      title: '日志代码块核心源码'
    },
    {
      component: ServiceTableCard,
      imports: ['vButton', 'vCard'],
      title: '表格操作核心源码'
    },
    {
      component: PagedServiceTableCard,
      imports: ['vCard', 'vPagination', 'vTable'],
      title: '分页表格核心源码'
    },
    {
      component: ChartAdapterCard,
      imports: ['vCard', 'vChart'],
      title: '图表宿主核心源码'
    }
  ]
};
