import { vCard, vMessageManager } from '../../../src/index.js';

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

export const feedbackCategory = {
  description: '局部消息容器、消息替换与生命周期清理。',
  id: 'feedback',
  title: '反馈消息',
  demos: [
    {
      component: LocalMessageManagerCard,
      imports: ['vCard', 'vMessageManager'],
      title: '局部消息管理器核心源码'
    }
  ]
};
