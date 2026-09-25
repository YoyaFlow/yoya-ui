import { vForm } from '@yoyaflow/yoya-ui';
import { statusOptions } from '../utils/options.js';

export function RoleToolbar({ onSearch, onAdd }) {
  // 形态 A 薄工厂：没有对外命令方法，结构就地声明；句柄留在函数作用域里给事件回调读值
  const form = vForm((f) => {
    f.style({ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' });
    f.vFormItem((item) => {
      item.style({ display: 'flex', alignItems: 'center', gap: '8px' });
      item.label('关键词').name('keyword');
      item.control((editor) => editor.vInput({ name: 'keyword', placeholder: '名称 / 标识' }));
    });
    f.vFormItem((item) => {
      item.style({ display: 'flex', alignItems: 'center', gap: '8px' });
      item.label('状态').name('status');
      item.control((editor) =>
        editor.vSelect({ name: 'status', options: statusOptions, placeholder: '全部' })
      );
    });
    f.vButton('查询', (btn) => {
      btn.variant('primary');
      btn.on('click', search);
    });
    f.vButton('重置', (btn) => btn.on('click', reset));
    f.vButton('新增角色', (btn) => {
      btn.variant('primary');
      btn.style('marginLeft', 'auto');
      btn.on('click', onAdd);
    });
    f.on('submit', (event) => {
      event.preventDefault();
      search();
    });
  });

  function values() {
    return form.values();
  }

  function search() {
    onSearch(values());
  }

  function reset() {
    form.values({ keyword: '', status: '' });
    search();
  }

  return form;
}
