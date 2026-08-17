import {
  createI18n,
  section,
  toast,
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
`.trim()
};

/**
 * 渲染第一批复合组件示例：vCard、vButton、vMessageContainer 和 toast。
 */
export function renderComponentsExample(target = '#app') {
  const jobState = vText('等待调度');
  const auditState = vText('尚未保存');
  let startButton = null;

  const messageHost = vMessageContainer({ placement: 'top-right' }).bindTo(document.body);
  toast.use(messageHost);

  const root = section((page) => {
    page.id('components-demo').className('components-shell');

    page.container((shell) => {
      shell.className('components-container');

      shell.header((header) => {
        header.className('components-header');
        header.h1('复合组件');
        header.p('后台页面常用操作、信息容器和即时反馈。');
      });

      shell.vstack((examples) => {
        examples.className('components-examples');
        examples.style('gap', '18px');

        examples.grid((example) => {
          example.className('component-example');
          example.styles({ gap: '18px', gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.9fr)' });

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
          example.className('component-example');
          example.styles({ gap: '18px', gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.9fr)' });

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
          example.className('component-example');
          example.styles({ gap: '18px', gridTemplateColumns: 'minmax(0, 1fr) minmax(340px, 0.9fr)' });

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
