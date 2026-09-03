import { describe, expect, it } from 'vitest';
import { AccessControlMembers } from './access-control.js';

describe('access control demo', () => {
  it('shows editable / disabled / hidden inputs and buttons', () => {
    const demo = AccessControlMembers();
    const el = demo.render().renderDom();

    // 输入控件：有权限可编辑、只读禁用、无权限隐藏
    const inputs = el.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].disabled).toBe(false);
    expect(inputs[1].disabled).toBe(true);
    expect(el.textContent).not.toContain('system:member:export');

    // 按钮：有写可点、只读禁用、无权限隐藏
    const buttons = [...el.querySelectorAll('button')];
    expect(buttons.find((b) => b.textContent === '删除').disabled).toBe(false);
    expect(buttons.find((b) => b.textContent === '归档').disabled).toBe(true);
    expect(buttons.find((b) => b.textContent === '导出')).toBeUndefined();
  });
});
