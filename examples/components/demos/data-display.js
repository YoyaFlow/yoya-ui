import { codeBlock, vButton, vCard, vText } from '../../../src/index.js';

export function ServiceDetailCard({ toast }) {
  const serviceState = vText('运行中');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务详情');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vDetail 将 label/value 结构集中到一个组件里，适合服务概览和只读资料。');
            stack.vDetail((detail) => {
              detail.vDetailItem((item) => {
                item.label('服务名称');
                item.value('api-gateway');
              });
              detail.vDetailItem((item) => {
                item.label('当前状态');
                item.value(serviceState);
              });
              detail.vDetailItem('负责人', 'SRE Team');
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
        card.vCardHeader('SQL 片段');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vCode 内置复制按钮，适合 SQL、日志和配置片段。');
            stack.vCode((code) => {
              code.language('sql');
              code.content('SELECT id, name, status FROM services ORDER BY updated_at DESC;');
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
    { name: 'api-gateway', status: '运行中', owner: 'SRE' },
    { name: 'worker', status: '空闲', owner: 'Platform' }
  ];

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务表格');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vTable 可以把列定义、空状态和行操作收拢在一个组件里。');
            stack.vTable((table) => {
              table.caption('在线服务');
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
                      button.label(row.status === '运行中' ? '重启' : '启动');
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

export const dataDisplayCategory = {
  description: '详情、代码片段与表格数据。',
  id: 'data-display',
  title: '数据展示',
  demos: [
    {
      component: ServiceDetailCard,
      imports: ['vCard', 'vText'],
      title: '服务详情核心源码'
    },
    { component: SqlSnippetCard, imports: ['vCard'], title: 'SQL 片段核心源码' },
    {
      component: CodeBlockCard,
      imports: ['codeBlock', 'vCard'],
      title: '日志代码块核心源码'
    },
    {
      component: ServiceTableCard,
      imports: ['vButton', 'vCard'],
      title: '服务表格核心源码'
    }
  ]
};
