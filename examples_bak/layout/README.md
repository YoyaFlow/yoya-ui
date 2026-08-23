# Layout 布局组件示例

这个目录演示 `container`、`grid`、`responsiveGrid`、`flex`、`stack`、`hstack`、`vstack`、`center`、`spacer` 和 `divider` 的组合方式。

示例保持和基础元素一致的父级回调写法。下面的完整模块可以直接复制到 `metrics-layout.js` 使用：

```js
import { section, vText } from 'yoya-ui';

const metrics = [
  ['请求量', '128k', '近 24 小时'],
  ['成功率', '99.92%', '接口稳定'],
  ['队列积压', '42', '低于阈值'],
  ['告警', '3', '待确认']
];

export function renderMetricsLayoutExample(target = '#app') {
  const statusText = vText('当前：四列指标');
  let compact = false;
  let metricsGrid = null;
  let densityButton = null;

  const applyDensity = () => {
    metricsGrid.style(
      'gridTemplateColumns',
      compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'
    );
    densityButton.attr('aria-pressed', compact ? 'true' : 'false');
    statusText.textContent(compact ? '当前：两列指标' : '当前：四列指标');
  };

  const root = section((page) => {
    page.id('metrics-layout');
    page.container((shell) => {
      shell.vstack((body) => {
        body.header((header) => {
          header.hstack((row) => {
            row.h1('运营指标');
            row.spacer();
            row.button((button) => {
              densityButton = button;
              button.attr('type', 'button').attr('aria-pressed', 'false');
              button.text('切换指标列数');
              button.on('click', () => {
                compact = !compact;
                applyDensity();
              });
            });
          });
          header.output((output) => output.child(statusText));
        });

        body.responsiveGrid((grid) => {
          metricsGrid = grid;
          grid.minColumnWidth('220px');
          grid.breakpoints({ 600: 2, 1000: 4 });
          grid.id('metric-grid');
          grid.style('gap', '12px');
          metrics.forEach(([label, value, hint]) => {
            grid.article((card) => {
              card.h2(label);
              card.strong(value);
              card.p(hint);
            });
          });
        });

        body.divider();

        body.grid((workspace) => {
          workspace.styles({ gap: '16px', gridTemplateColumns: 'minmax(0, 1fr) 280px' });
          workspace.section((panel) => {
            panel.h2('flex 工具条');
            panel.flex((toolbar) => {
              toolbar.styles({ alignItems: 'center', gap: '8px', flexWrap: 'wrap' });
              ['全部', '异常', '慢请求'].forEach((label) => {
                toolbar.button((button) => button.attr('type', 'button').text(label));
              });
            });
          });
          workspace.section((panel) => {
            panel.center((empty) => {
              empty.styles({ minHeight: '180px', textAlign: 'center' });
              empty.stack((content) => {
                content.h2('center + stack');
                content.p('适合空状态、加载态和局部占位。');
              });
            });
          });
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderMetricsLayoutExample('#app');
}
```

当前演示包含：

- `container`：页面内容宽度和左右内边距。
- `vstack`：页面主流程垂直排列。
- `hstack + spacer`：标题区左右分布。
- `grid`：指标卡片和两栏工作区。
- `responsiveGrid`：按最小列宽自动填充，并可用断点切换固定列数。
- `flex`：过滤按钮工具条。
- `stack`：居中预览中的垂直内容。
- `divider`：横向区域分隔和行内竖向分隔。
- `center`：空状态或局部预览居中。
- 一个按钮事件，用于在四列指标和两列指标之间切换；窗口变化时 `responsiveGrid` 会重新应用匹配的断点列数。

运行方式：

```bash
npm run examples:layout
```

然后打开 Vite 输出的地址，访问 `/examples/layout/index.html`。
