import { div, vConfirm } from '../../index.js';

export function ConfirmExample() {
  let result = null;
  let box = null;

  return {
    render() {
      return div((panel) => {
        panel.vstack({ gap: '12px' }, (stack) => {
          stack.div((b) => {
            box = b;
            b.attr('data-confirm-result', 'true');
            b.text(result ?? '尚未确认');
          });
          stack.vButton('删除服务', (b) => {
            b.variant('danger');
            b.on('click', async () => {
              const ok = await vConfirm({
                title: '删除确认',
                content: '确认删除选中的服务？此操作不可撤销。',
                confirmText: '删除',
                danger: true
              });
              result = ok ? '已确认删除' : '已取消';
              box.textContent(result);
            });
          });
        });
      });
    }
  };
}



