import { vMessageManager, vstack } from '../../index.js';

export function MessageManagerExample1() {
  const manager = vMessageManager();

  return {
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.child(manager);
        stack.hstack({ gap: '10px' }, (row) => {
          row.vButton('显示成功消息', (button) => {
            button.variant('primary');
            button.on('click', () => manager.success('保存成功', { duration: 0 }));
          });
          row.vButton('显示警告消息', (button) => {
            button.on('click', () => manager.warning('配置即将过期', { duration: 0 }));
          });
        });
      });
    }
  };
}
