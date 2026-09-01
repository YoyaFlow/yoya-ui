import { toast, vstack } from '@yoyaflow/yoya-ui';

export function PlaceholderPage({ title, text }) {
  return vstack({ gap: '16px' }, (stack) => {
    stack.h2(title);
    stack.vCard((card) => {
      card.vCardHeader(title);
      card.vCardBody((body) => {
        body.p(text);
        body.vButton('操作', (btn) => {
          btn.variant('primary');
          btn.on('click', () => toast.success(`${title} 操作成功`));
        });
      });
    });
  });
}
