import { vButton } from '@yoyaflow/yoya-ui';

// 共享 UI：按钮类（跨模块复用的通用按钮，按类别集中管理）。
// 表格/树行内操作按钮：小尺寸、常规字重，避免行内文字显得粗重。
export function RowActionButton(text, setup = null) {
  return vButton(text, (btn) => {
    btn.size('small');
    btn.style('fontWeight', '400');
    if (typeof setup === 'function') {
      setup(btn);
    }
  });
}
