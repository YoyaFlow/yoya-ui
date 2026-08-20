import { vCard, vMessageManager, vText } from '../../../src/index.js';

export function DeploymentTaskCard({ locale, toast }) {
  const jobState = vText('等待调度');
  let startButton = null;

  return {
    render() {
      return vCard((card) => {
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
              ['拉取镜像', '应用配置', '重启服务'].forEach((item) => list.li(item));
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
    }
  };
}

export function AuditCard({ locale, toast }) {
  const auditState = vText('尚未保存');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('配置审计');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.grid((metrics) => {
              metrics.styles({ gap: '12px', gridTemplateColumns: '1fr 1fr' });
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
            button.on('click', () => toast.error('操作被拦截', { duration: 0 }));
          });
        });
      });
    }
  };
}

export function LocaleSwitchCard({ locale, toast }) {
  return {
    render() {
      return vCard((card) => {
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
            button.id('switch-zh');
            button.on('click', () => {
              locale.setLanguage('zh-CN');
              toast.info('语言已切换为中文', { duration: 0 });
            });
          });
          footer.vButton((button) => {
            button.label('English');
            button.id('switch-en');
            button.on('click', () => {
              locale.setLanguage('en');
              toast.info('Language switched to English', { duration: 0 });
            });
          });
        });
      });
    }
  };
}

export function LocalMessageManagerCard() {
  const manager = vMessageManager({ placement: 'top-right' });
  manager.container().styles({
    bottom: null,
    left: null,
    maxWidth: 'none',
    position: 'static',
    right: null,
    top: null,
    width: '100%'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('局部消息管理器');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('消息容器只属于当前卡片，可按 ID 替换消息，并在管理器销毁时统一清理。');
            stack.child(manager);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.id('local-message-success');
            button.label('显示成功消息');
            button.variant('primary');
            button.on('click', () => {
              manager.success('局部保存成功', { id: 'local-status', duration: 0 });
            });
          });
          footer.vButton((button) => {
            button.id('local-message-replace');
            button.label('替换同 ID 消息');
            button.on('click', () => {
              manager.warning('同 ID 消息已替换', { id: 'local-status', duration: 0 });
            });
          });
          footer.vButton((button) => {
            button.id('local-message-clear');
            button.label('清空局部消息');
            button.on('click', () => manager.clear());
          });
        });
      });
    }
  };
}

export const actionsFeedbackCategory = {
  description: '任务操作、审计状态、国际化按钮与局部即时反馈。',
  id: 'actions-feedback',
  title: '操作与反馈',
  demos: [
    {
      component: DeploymentTaskCard,
      imports: ['vCard', 'vText'],
      title: '部署任务核心源码'
    },
    { component: AuditCard, imports: ['vCard', 'vText'], title: '配置审计核心源码' },
    { component: LocaleSwitchCard, imports: ['vCard'], title: '语言切换核心源码' },
    {
      component: LocalMessageManagerCard,
      imports: ['vCard', 'vMessageManager'],
      title: '局部消息管理器核心源码'
    }
  ]
};
