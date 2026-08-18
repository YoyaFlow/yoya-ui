import {
  createI18n,
  section,
  toast,
  vButton,
  vMessageContainer,
  vText
} from '../../src/index.js';

const locale = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': {
      actions: {
        danger: '危险操作',
        refresh: '刷新状态',
        save: '保存配置',
        start: '启动任务'
      }
    },
    en: {
      actions: {
        danger: 'Danger',
        refresh: 'Refresh',
        save: 'Save',
        start: 'Start job'
      }
    }
  }
});

const sourceSnippets = {
  deploy: `
grid.vCard((card) => {
  card.vCardHeader('部署任务');
  card.vCardBody((body) => {
    body.vstack((stack) => {
      stack.hstack((row) => {
        row.span('当前状态');
        row.spacer();
        row.output((output) => output.child(jobState));
      });
    });
  });
  card.vCardFooter((footer) => {
    footer.vButton((button) => {
      button.label(locale.text('actions.start'));
      button.variant('primary');
      button.on('click', () => {
        startButton.loading(true);
        toast.info('任务已启动', { duration: 0 });
      });
    });
  });
});
`.trim(),
  audit: `
card.vCardFooter((footer) => {
  footer.vButton((button) => {
    button.id('save-config');
    button.label(locale.text('actions.save'));
    button.variant('primary');
    button.on('click', () => {
      auditState.textContent('配置已保存');
      toast.success('配置已保存', { duration: 0 });
    });
  });
  footer.vButton((button) => {
    button.label(locale.text('actions.danger'));
    button.variant('danger');
  });
});
`.trim(),
  locale: `
card.vCardFooter((footer) => {
  footer.vButton((button) => {
    button.label('中文');
    button.attr('id', 'switch-zh');
    button.on('click', () => locale.setLanguage('zh-CN'));
  });
  footer.vButton((button) => {
    button.label('English');
    button.attr('id', 'switch-en');
    button.on('click', () => {
      locale.setLanguage('en');
      toast.info('Language switched to English', { duration: 0 });
    });
  });
});
`.trim(),
  menu: `
card.vCardBody((body) => {
  body.vMenu((menu) => {
    menu.vMenuItem((item) => {
      item.icon('R');
      item.text('刷新状态');
      item.shortcut('Ctrl+R');
      item.active(true);
      item.on('click', () => {
        toast.info('菜单触发：刷新状态', { duration: 0 });
      });
    });
    menu.vMenuItem((item) => {
      item.text('删除服务');
      item.shortcut('Del');
      item.danger(true);
      item.disabled(true);
    });
  });
});
`.trim(),
  overlay: `
card.vCardBody((body) => {
  body.hstack((menu) => {
    menu.vDropdownMenu((dropdown) => {
      dropdown.trigger((button) => {
        button.id('dropdown-trigger');
        button.label('更多操作');
      });
      dropdown.menuContent((commands) => {
        commands.vMenuItem('导出报表');
      });
    });
    menu.vContextMenu((context) => {
      context.target('右键服务行');
      context.menuContent((commands) => {
        commands.vMenuItem('重启服务');
      });
    });
  });
});
`.trim(),
  detail: `
card.vCardBody((body) => {
  body.vDetail((detail) => {
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
`.trim(),
  code: `
card.vCardBody((body) => {
  body.vCode((code) => {
    code.language('sql');
    code.content('SELECT id, name, status FROM services ORDER BY updated_at DESC;');
  });
});
`.trim(),
  table: `
card.vCardBody((body) => {
  body.vTable((table) => {
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
          })
      }
    ]);
    table.rows(services);
    table.emptyText('暂无服务');
  });
});
`.trim()
};

const exampleGridStyles = {
  gap: '12px',
  gridTemplateColumns: 'minmax(0, 1fr)',
  width: '100%'
};

function styleExampleGrid(example) {
  example.className('component-example');
  example.styles(exampleGridStyles);
}

/**
 * 渲染复合组件示例：vCard、vButton、vMessageContainer、toast、vDetail、vCode 和 vTable。
 */
export function renderComponentsExample(target = '#app') {
  const jobState = vText('等待调度');
  const auditState = vText('尚未保存');
  const serviceState = vText('运行中');
  const services = [
    { name: 'api-gateway', status: '运行中', owner: 'SRE' },
    { name: 'worker', status: '空闲', owner: 'Platform' }
  ];
  let startButton = null;

  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  toast.use(messageHost);

  const root = section((page) => {
    page.id('components-demo').className('components-shell');

    page.container((shell) => {
      shell.className('components-container');
      shell.styles({
        boxSizing: 'border-box',
        margin: '0 auto',
        maxWidth: '1160px',
        padding: '0 24px',
        width: '100%'
      });

      shell.header((header) => {
        header.className('components-header');
        header.h1('复合组件');
        header.p('后台页面常用操作、信息容器和即时反馈。');
      });

      shell.vstack((examples) => {
        examples.className('components-examples');
        examples.style('gap', '18px');
        examples.style('width', '100%');

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
            card.vCardHeader('部署任务');
            card.vCardBody((body) => {
              body.vstack((stack) => {
                stack.style('gap', '14px');

                stack.hstack((row) => {
                  row.className('task-row');
                  row.span('当前状态');
                  row.spacer();
                  row.output((output) => output.child(jobState));
                });

                stack.ul((list) => {
                  list.className('task-log');
                  ['拉取镜像', '应用配置', '重启服务'].forEach((item) => {
                    list.li(item);
                  });
                });
              });
            });
            card.vCardFooter((footer) => {
              footer.vButton((button) => {
                startButton = button;
                button.id('start-job');
                button.label(locale.text('actions.start'));
                button.variant('primary');
                button.on('click', () => {
                  startButton.loading(true);
                  jobState.textContent('运行中');
                  toast.info('任务已启动', { duration: 0 });

                  setTimeout(() => {
                    startButton.loading(false);
                    jobState.textContent('已完成');
                    toast.success('任务完成', { duration: 0 });
                  }, 600);
                });
              });
              footer.vButton((button) => {
                button.label(locale.text('actions.refresh'));
                button.on('click', () => {
                  jobState.textContent('状态已刷新');
                  toast.info('状态已刷新', { duration: 0 });
                });
              });
            });
          });

          exampleSource(example, '部署任务核心源码', sourceSnippets.deploy);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
            card.vCardHeader('配置审计');
            card.vCardBody((body) => {
              body.vstack((stack) => {
                stack.style('gap', '14px');
                stack.grid((metrics) => {
                  metrics.styles({
                    gap: '12px',
                    gridTemplateColumns: '1fr 1fr'
                  });
                  metrics.div((metric) => {
                    metric.className('metric');
                    metric.span('变更项');
                    metric.strong('8');
                  });
                  metrics.div((metric) => {
                    metric.className('metric');
                    metric.span('通过率');
                    metric.strong('99%');
                  });
                });
                stack.hstack((row) => {
                  row.className('feedback-row');
                  row.span('审计结果');
                  row.spacer();
                  row.output((output) => output.child(auditState));
                });
              });
            });
            card.vCardFooter((footer) => {
              footer.vButton((button) => {
                button.id('save-config');
                button.label(locale.text('actions.save'));
                button.variant('primary');
                button.on('click', () => {
                  auditState.textContent('配置已保存');
                  toast.success('配置已保存', { duration: 0 });
                });
              });
              footer.vButton((button) => {
                button.label(locale.text('actions.danger'));
                button.variant('danger');
                button.on('click', () => {
                  toast.error('操作被拦截', { duration: 0 });
                });
              });
            });
          });

          exampleSource(example, '配置审计核心源码', sourceSnippets.audit);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
            card.vCardHeader('语言与反馈');
            card.vCardBody((body) => {
              body.vstack((stack) => {
                stack.style('gap', '14px');
                stack.hstack((row) => {
                  row.className('locale-row');
                  row.span('当前语言');
                  row.spacer();
                  row.output('zh-CN / en');
                });
                stack.p('按钮文案由 I18nTextNode 驱动，语言切换时组件树保持不变。');
                stack.div((notice) => {
                  notice.className('danger-zone');
                  notice.p('危险动作使用 vButton 的 danger 类型保持一致的视觉语义。');
                });
              });
            });
            card.vCardFooter((footer) => {
              footer.vButton((button) => {
                button.label('中文');
                button.attr('id', 'switch-zh');
                button.on('click', () => {
                  locale.setLanguage('zh-CN');
                  toast.info('语言已切换为中文', { duration: 0 });
                });
              });
              footer.vButton((button) => {
                button.label('English');
                button.attr('id', 'switch-en');
                button.on('click', () => {
                  locale.setLanguage('en');
                  toast.info('Language switched to English', { duration: 0 });
                });
              });
            });
          });

          exampleSource(example, '语言切换核心源码', sourceSnippets.locale);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
            card.vCardHeader('命令菜单');
            card.vCardBody((body) => {
              body.vstack((stack) => {
                stack.style('gap', '14px');
                stack.p('vMenuItem 可以承载图标、文本、快捷键、选中状态、危险状态和禁用状态。');
                stack.vMenu((menu) => {
                  menu.vMenuItem((item) => {
                    item.attr('id', 'menu-refresh');
                    item.icon('R');
                    item.text('刷新状态');
                    item.shortcut('Ctrl+R');
                    item.active(true);
                    item.on('click', () => {
                      toast.info('菜单触发：刷新状态', { duration: 0 });
                    });
                  });
                  menu.vMenuItem((item) => {
                    item.icon('S');
                    item.text('系统设置');
                    item.shortcut('Ctrl+,');
                    item.on('click', () => {
                      toast.info('菜单触发：系统设置', { duration: 0 });
                    });
                  });
                  menu.vMenuItem((item) => {
                    item.icon('D');
                    item.text('删除服务');
                    item.shortcut('Del');
                    item.danger(true);
                    item.disabled(true);
                  });
                });
              });
            });
          });

          exampleSource(example, '命令菜单核心源码', sourceSnippets.menu);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
            card.vCardHeader('浮层菜单');
            card.vCardBody((body) => {
              body.vstack((stack) => {
                stack.style('gap', '14px');
                stack.p('vDropdownMenu 用于按钮触发的次级操作；vContextMenu 用于绑定右键目标区域。');
                stack.hstack((menu) => {
                  menu.className('overlay-actions');
                  menu.vDropdownMenu((dropdown) => {
                    dropdown.placement('bottom-end');
                    dropdown.trigger((button) => {
                      button.id('dropdown-trigger');
                      button.label('更多操作');
                      button.variant('secondary');
                    });
                    dropdown.menuContent((commands) => {
                      commands.vMenuItem((item) => {
                        item.attr('id', 'dropdown-export');
                        item.icon('E');
                        item.text('导出报表');
                        item.shortcut('Ctrl+E');
                        item.on('click', () => {
                          toast.info('菜单触发：导出报表', { duration: 0 });
                        });
                      });
                      commands.vMenuItem((item) => {
                        item.icon('A');
                        item.text('归档任务');
                        item.on('click', () => {
                          toast.warning('菜单触发：归档任务', { duration: 0 });
                        });
                      });
                    });
                  });
                  menu.vContextMenu((context) => {
                    context.target((target) => {
                      target.id('context-target');
                      target.className('context-demo-target');
                      target.strong('服务 api-gateway');
                      target.span('右键打开服务操作');
                    });
                    context.menuContent((commands) => {
                      commands.vMenuItem((item) => {
                        item.attr('id', 'context-restart');
                        item.icon('R');
                        item.text('重启服务');
                        item.shortcut('Ctrl+Shift+R');
                        item.on('click', () => {
                          toast.success('菜单触发：重启服务', { duration: 0 });
                        });
                      });
                      commands.vMenuItem((item) => {
                        item.icon('D');
                        item.text('下线服务');
                        item.danger(true);
                        item.on('click', () => {
                          toast.error('菜单触发：下线服务', { duration: 0 });
                        });
                      });
                    });
                  });
                });
              });
            });
          });

          exampleSource(example, '浮层菜单核心源码', sourceSnippets.overlay);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
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
                  serviceState.textContent(serviceState.textContent() === '运行中' ? '维护中' : '运行中');
                  toast.info(`状态已切换为 ${serviceState.textContent()}`, { duration: 0 });
                });
              });
            });
          });

          exampleSource(example, '服务详情核心源码', sourceSnippets.detail);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
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

          exampleSource(example, 'SQL 片段核心源码', sourceSnippets.code);
        });

        examples.grid((example) => {
          styleExampleGrid(example);

          example.vCard((card) => {
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

          exampleSource(example, '服务表格核心源码', sourceSnippets.table);
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderComponentsExample('#app');
}

function exampleSource(parent, title, source) {
  parent.aside((panel) => {
    panel.className('source-panel');
    panel.style('width', '100%');
    panel.h2(title);
    panel.pre((pre) => {
      pre.className('source-code');
      pre.code((code) => {
        code.attr('data-source-example', title);
        code.text(source);
      });
    });
  });
}
