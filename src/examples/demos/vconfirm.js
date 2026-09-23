import { div, ref, vConfirm, vText } from '../../index.js';

export function ConfirmExample() {
  const result = ref('尚未确认');

  return div((panel) => {
    panel.vstack({ gap: '12px' }, (stack) => {
      stack.div((b) => {
        b.attr('data-confirm-result', 'true');
        b.child(vText(result));
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
          result.value = ok ? '已确认删除' : '已取消';
        });
      });
    });
  });
}
