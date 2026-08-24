import { vCard, vText } from '../../index.js';

export function DeploymentTaskCard({ locale, toast }) {
  const jobState = vText('等待执行');
  let startButton = null;

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('按钮状态');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.hstack((row) => {
              row.className('task-row');
              row.span('按钮状态');
              row.spacer();
              row.output((output) => output.child(jobState));
            });
            stack.ul((list) => {
              list.className('task-log');
              ['准备参数', '执行动作', '完成回写'].forEach((item) => list.li(item));
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
              jobState.textContent('执行中');
              toast.info('操作已启动', { duration: 0 });
              setTimeout(() => {
                startButton.loading(false);
                jobState.textContent('已完成');
                toast.success('操作完成', { duration: 0 });
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
        card.vCardHeader('危险按钮');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.grid((metrics) => {
              metrics.styles({ gap: '12px', gridTemplateColumns: '1fr 1fr' });
              metrics.div((metric) => {
                metric.className('metric');
                metric.span('状态项');
                metric.strong('8');
              });
              metrics.div((metric) => {
                metric.className('metric');
                metric.span('确认率');
                metric.strong('99%');
              });
            });
            stack.hstack((row) => {
              row.className('feedback-row');
              row.span('按钮结果');
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
              auditState.textContent('设置已保存');
              toast.success('设置已保存', { duration: 0 });
            });
          });
          footer.vButton((button) => {
            button.label(locale.text('actions.danger'));
            button.variant('danger');
            button.on('click', () => toast.error('危险操作被拦截', { duration: 0 }));
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
        card.vCardHeader('国际化按钮');
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
              notice.p('danger 语义按钮保持一致的视觉反馈。');
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

export const actionsCategory = {
  description: '按钮状态、危险操作与国际化按钮。',
  id: 'actions',
  title: '操作组件',
  demos: [
    {
      component: DeploymentTaskCard,
      imports: ['vCard', 'vText'],
      title: '按钮状态核心源码'
    },
    { component: AuditCard, imports: ['vCard', 'vText'], title: '危险按钮核心源码' },
    { component: LocaleSwitchCard, imports: ['vCard'], title: '国际化按钮核心源码' }
  ]
};
