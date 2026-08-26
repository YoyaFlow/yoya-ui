import {
  codeBlock,
  divider,
  flex,
  hstack,
  responsiveGrid,
  spacer,
  stack,
  vBody,
  vButton,
  vCard,
  vCheckbox,
  vCode,
  vDetail,
  vDynamicLoader,
  vDropdownMenu,
  vField,
  vForm,
  vInput,
  vMessageContainer,
  vMessageManager,
  vMenu,
  vPagination,
  vRate,
  vSelect,
  vScroll,
  vSwitch,
  vTable,
  vTextarea,
  vTimer,
  vTimerRange,
  vTabs,
  vUpload,
  vText,
  vChart,
  vRouter,
  vRouterViews,
  vRoute,
  router,
  div
} from '../index.js';

export function ButtonExample1() {
  return {
    render() {
      return vButton('OK')
        .variant('primary')
        .on('click', () => {
          console.log('clicked');
        });
    }
  };
}

export function ButtonVariantsExample1() {
  return {
    render() {
      return hstack((row) => {
        row.style('gap', '10px');
        row.vButton((button) => {
          button.label('主要按钮');
          button.variant('primary');
        });
        row.vButton('默认按钮');
        row.vButton((button) => {
          button.label('危险按钮');
          button.variant('danger');
        });
        row.vButton((button) => {
          button.label('幽灵按钮');
          button.variant('ghost');
        });
      });
    }
  };
}

export function ButtonSizesExample1() {
  return {
    render() {
      return hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px' });
        ['small', 'medium', 'large'].forEach((size) => {
          row.vButton((button) => {
            button.label(size);
            button.size(size);
          });
        });
      });
    }
  };
}

export function ButtonStatesExample1() {
  const state = vText('等待点击');

  return {
    render() {
      return hstack((row) => {
        row.style('gap', '10px');
        row.vButton((button) => {
          button.label('执行任务');
          button.variant('primary');
          button.on('click', () => {
            state.textContent('执行中');
            button.loading(true);
            setTimeout(() => {
              button.loading(false);
              state.textContent('已完成');
            }, 600);
          });
        });
        row.vButton((button) => {
          button.label('不可用');
          button.disabled(true);
        });
        row.child(state);
      });
    }
  };
}

export function ButtonFormExample1() {
  const result = vText('尚未提交');

  return {
    render() {
      return vForm((form) => {
        form.style('gap', '12px');
        form.hstack((row) => {
          row.style('gap', '10px');
          row.vButton((button) => {
            button.label('提交表单');
            button.variant('primary');
            button.formType('submit');
          });
          row.vButton((button) => {
            button.label('重置');
            button.formType('reset');
          });
        });
        form.output((output) => output.child(result));
        form.on('submit', (event) => {
          event.preventDefault();
          result.textContent('已提交');
        });
        form.on('reset', () => result.textContent('已重置'));
      });
    }
  };
}

export function DividerExample1() {
  return {
    render() {
      return stack((content) => {
        content.p('上方内容');
        content.child(divider());
        content.p('下方内容');
      });
    }
  };
}

export function FlexExample1() {
  return {
    render() {
      return flex((content) => {
        content.style('gap', '12px');
        content.span('左侧');
        content.spacer();
        content.span('右侧');
      });
    }
  };
}

export function GridExample1() {
  return {
    render() {
      return responsiveGrid({
        minColumnWidth: 160,
        children: ['A', 'B', 'C'].map((label) => div(label))
      });
    }
  };
}

export function LayoutExample1() {
  return {
    render() {
      return vBody({
        maxWidth: 960,
        content: (content) => content.p('页面内容')
      });
    }
  };
}

export function SpacerExample1() {
  return {
    render() {
      return hstack((row) => {
        row.span('服务状态');
        row.child(spacer());
        row.vButton('查看');
      });
    }
  };
}

export function DropdownMenuExample1() {
  const status = vText('当前：未选择');
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
        item.on('click', () => status.textContent('当前：导出报表'));
      });
      content.vMenuItem((item) => {
        item.attr('data-dropdown-demo-item', 'archive');
        item.text('归档任务');
        item.shortcut('Ctrl+Shift+A');
        item.on('click', () => status.textContent('当前：归档任务'));
      });
      content.vMenuDivider();
      content.vMenuItem((item) => {
        item.attr('data-dropdown-demo-item', 'sticky');
        item.text('保持菜单展开');
        item.on('click', () => status.textContent('当前：保持菜单展开'));
      });
    });
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('下拉菜单');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('按钮触发的浮层菜单，支持键盘打开，适合放在页面右上角或卡片动作区。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('触发状态');
              row.spacer();
              row.output((output) => {
                output.className('components-route-note');
                output.attr('data-dropdown-demo-status', 'true');
                output.child(status);
              });
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('操作区');
              row.spacer();
              row.child(dropdown);
            });
            content.p('ArrowDown / ArrowUp / Enter / Space 可以打开；Escape 会关闭并回到按钮。');
            content.p('closeOnSelect(false) 适合连续点选和批量动作。');
          });
        });
      });
    }
  };
}

export function MenuExample1() {
  return {
    render() {
      return vMenu((menu) => {
        menu.vMenuGroup((group) => {
          group.label('常用操作');
          group.vMenuItem({ text: '刷新状态', active: true });
          group.vMenuItem({ text: '系统设置' });
        });
      });
    }
  };
}

export function PaginationExample1() {
  return {
    render() {
      return vPagination({
        page: 1,
        pageSize: 10,
        total: 42,
        onChange({ page }) {
          console.log('当前页', page);
        }
      });
    }
  };
}

export function TabsExample1() {
  return {
    render() {
      return vTabs((tabs) => {
        tabs.ariaLabel('服务标签');
        tabs.vTab((tab) => {
          tab.key('overview');
          tab.label('概览');
          tab.content('服务概览');
        });
        tabs.vTab((tab) => {
          tab.key('logs');
          tab.label('日志');
          tab.content('运行日志');
        });
      });
    }
  };
}

export function RouterExample1() {
  const appRouter = router((routes) => {
    routes.route('/overview', () => div('概览内容'));
    routes.notFound(() => div('未找到页面'));
  });

  return {
    render() {
      return hstack((content) => {
        content.vLink(appRouter, { label: '概览', to: '/overview' });
        content.vRouterView(appRouter);
      });
    }
  };
}

export function RouterViewsExample1() {
  const appRouter = vRouter({
    default: '/overview',
    routes: [
      vRoute('/overview', { title: 'overview.js', view: () => div('概览内容') }),
      vRoute('/settings', { title: 'settings.js', view: () => div('设置内容') })
    ]
  });

  return {
    render() {
      return vRouterViews(appRouter, { title: '未打开文件', titlePosition: 'left' });
    }
  };
}

export function FormExample1() {
  return {
    render() {
      return vForm((form) => {
        form.vInput({ name: 'serviceName', value: 'api-gateway' });
        form.vButton((button) => {
          button.label('提交');
          button.formType('submit');
        });
        form.on('submit', (event) => {
          event.preventDefault();
          console.log(form.values());
        });
      });
    }
  };
}

export function InputExample1() {
  return {
    render() {
      return vInput({
        placeholder: '请输入服务名',
        value: 'api-gateway'
      });
    }
  };
}

export function SelectExample1() {
  return {
    render() {
      return vSelect({
        options: ['运行中', '维护中', '已停用'],
        value: '运行中'
      });
    }
  };
}

export function CheckboxExample1() {
  return {
    render() {
      return vCheckbox({ checked: true, label: '启用自动保存' });
    }
  };
}

export function TextareaExample1() {
  return {
    render() {
      return vTextarea({ rows: 4, value: '初始说明' });
    }
  };
}

export function SwitchExample1() {
  return {
    render() {
      return vSwitch({ checked: true, label: '自动部署' });
    }
  };
}

export function FieldExample1() {
  return {
    render() {
      return vField((field) => {
        field.label('负责人');
        field.display('SRE Team');
        field.control((editor) => editor.vInput({ value: 'SRE Team' }));
      });
    }
  };
}

export function TimerExample1() {
  return {
    render() {
      return vTimer({
        mode: 'datetime-local',
        value: '2026-08-19T14:30'
      });
    }
  };
}

export function TimerRangeExample1() {
  return {
    render() {
      return vTimerRange({
        name: 'maintenance',
        value: { start: '2026-08-19', end: '2026-08-21' }
      });
    }
  };
}

export function UploadExample1() {
  return {
    render() {
      return vUpload({
        multiple: true,
        accept: '.txt,.png,.jpg,.pdf'
      });
    }
  };
}

export function RateExample1() {
  return {
    render() {
      return vRate({
        allowHalf: true,
        count: 5,
        name: 'quality',
        value: 4
      });
    }
  };
}

export function DetailExample1() {
  return {
    render() {
      return vDetail((detail) => {
        detail.vDetailItem({ label: '名称', value: '示例服务' });
        detail.vDetailItem({ label: '状态', value: '运行中' });
      });
    }
  };
}

export function CodeExample1() {
  return {
    render() {
      return vCode({
        content: 'SELECT id, name FROM services;',
        language: 'sql'
      });
    }
  };
}

export function TableExample1() {
  return {
    render() {
      return vTable({
        columns: [
          { key: 'name', label: '名称' },
          { key: 'status', label: '状态' }
        ],
        rows: [{ name: 'api-gateway', status: '运行中' }]
      });
    }
  };
}

export function CardExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('服务总览');
        card.vCardBody((body) => body.p('当前状态稳定。'));
        card.vCardFooter((footer) => footer.vButton('查看详情'));
      });
    }
  };
}

export function ChartExample1() {
  const chart = vChart({
    adapter: {
      init(host) {
        host.textContent = '图表内容';
        return { host };
      },
      update() {},
      resize() {},
      destroy() {}
    },
    data: [42, 58, 36]
  });

  return {
    render() {
      return chart;
    }
  };
}

export function CodeBlockExample1() {
  return {
    render() {
      return codeBlock({
        content: 'level=info status=ready',
        language: 'log'
      });
    }
  };
}

export function DynamicLoaderExample1() {
  return {
    render() {
      return vDynamicLoader({
        auto: true,
        loader: () => Promise.resolve({ name: '审计模块' }),
        views: {
          loaded: (module) => div(`${module.name}已就绪`),
          loading: () => div('正在加载'),
          error: (error) => div(`加载失败：${error.message}`)
        }
      });
    }
  };
}

export function MessageExample1() {
  const messages = vMessageContainer();

  return {
    render() {
      return stack((content) => {
        content.child(messages);
        content.vButton((button) => {
          button.label('显示成功消息');
          button.on('click', () => messages.success('保存成功', { duration: 0 }));
        });
      });
    }
  };
}

export function MessageManagerExample1() {
  const manager = vMessageManager();

  return {
    render() {
      return stack((content) => {
        content.child(manager);
        content.vButton('显示消息').on('click', () => manager.success('保存成功', { duration: 0 }));
      });
    }
  };
}

export function ScrollExample1() {
  const source = Array.from({ length: 24 }, (_, index) => `条目 ${index + 1}`);

  return {
    render() {
      return vScroll((scroll) => {
        scroll.style('height', '280px');
        scroll.items(source.slice(0, 6), (item) => div(item));
        scroll.loadMore(({ append, block, page }) => {
          const start = page * 6;
          const next = source.slice(start, start + 6);
          append(next);
          if (start + next.length >= source.length) {
            block(true);
          }
        });
        scroll.threshold(48);
      });
    }
  };
}

export const detailSourceRegistry = Object.freeze({
  'general:0': { component: ButtonExample1, imports: ['vButton'] },
  'layout:0': { component: DividerExample1, imports: ['divider', 'stack'] },
  'layout:1': { component: FlexExample1, imports: ['flex'] },
  'layout:2': { component: GridExample1, imports: ['div', 'responsiveGrid'] },
  'layout:3': { component: LayoutExample1, imports: ['vBody'] },
  'layout:4': { component: SpacerExample1, imports: ['hstack', 'spacer'] },
  'navigation:2': { component: DropdownMenuExample1, imports: ['vDropdownMenu'] },
  'navigation:3': { component: MenuExample1, imports: ['vMenu'] },
  'navigation:4': { component: PaginationExample1, imports: ['vPagination'] },
  'navigation:6': { component: TabsExample1, imports: ['vTabs'] },
  'navigation:7': { component: RouterExample1, imports: ['div', 'hstack', 'router'] },
  'navigation:8': {
    component: RouterViewsExample1,
    imports: ['div', 'vRoute', 'vRouter', 'vRouterViews']
  },
  'form:0': { component: FormExample1, imports: ['vForm'] },
  'form:1': { component: InputExample1, imports: ['vInput'] },
  'form:2': { component: SelectExample1, imports: ['vSelect'] },
  'form:3': { component: CheckboxExample1, imports: ['vCheckbox'] },
  'form:5': { component: TextareaExample1, imports: ['vTextarea'] },
  'form:6': { component: SwitchExample1, imports: ['vSwitch'] },
  'form:7': { component: FieldExample1, imports: ['vField'] },
  'form:8': { component: TimerExample1, imports: ['vTimer'] },
  'form:9': { component: TimerRangeExample1, imports: ['vTimerRange'] },
  'form:10': { component: UploadExample1, imports: ['vUpload'] },
  'form:11': { component: RateExample1, imports: ['vRate'] },
  'data-display:2': { component: DetailExample1, imports: ['vDetail'] },
  'data-display:3': { component: CodeExample1, imports: ['vCode'] },
  'data-display:4': { component: TableExample1, imports: ['vTable'] },
  'data-display:5': { component: CardExample1, imports: ['vCard'] },
  'data-display:6': { component: ChartExample1, imports: ['vChart'] },
  'data-display:9': { component: ScrollExample1, imports: ['div', 'vScroll'] },
  'async:0': { component: DynamicLoaderExample1, imports: ['div', 'vDynamicLoader'] },
  'feedback:0': { component: MessageExample1, imports: ['stack', 'vMessageContainer'] },
  'feedback:1': { component: MessageManagerExample1, imports: ['stack', 'vMessageManager'] }
});
