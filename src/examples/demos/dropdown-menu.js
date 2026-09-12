import { ref, vDropdownMenu, vText, vstack } from '../../index.js';

export function DropdownMenuExample1() {
  const status = ref('当前：未选择');
  const dropdown = vDropdownMenu((menu) => {
    menu.attr('data-dropdown-demo', 'true');
    menu.placement('bottom-end');
    menu.closeOnSelect(false);
    menu.trigger((button) => {
      button.attr('data-dropdown-demo-trigger', 'true');
      button.label('更多操作');
      button.variant('secondary');
    });
    menu.menuContent((content) => {
      content.vMenuItem((item) => {
        item.attr('data-dropdown-demo-item', 'export');
        item.text('导出报表');
        item.shortcut('Ctrl+E');
        item.on('click', () => {
          status.value = '当前：导出报表';
        });
      });
      content.vMenuItem((item) => {
        item.attr('data-dropdown-demo-item', 'archive');
        item.text('归档任务');
        item.shortcut('Ctrl+Shift+A');
        item.on('click', () => {
          status.value = '当前：归档任务';
        });
      });
      content.vMenuDivider();
      content.vMenuItem((item) => {
        item.attr('data-dropdown-demo-item', 'sticky');
        item.text('保持菜单展开');
        item.on('click', () => {
          status.value = '当前：保持菜单展开';
        });
      });
    });
  });

  return {
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.output((out) => {
          out.attr('data-dropdown-demo-status', 'true');
          out.child(vText(status));
        });
        stack.child(dropdown);
      });
    }
  };
}
