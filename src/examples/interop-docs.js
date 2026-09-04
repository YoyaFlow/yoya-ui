import { section } from '../index.js';

const INTEROP_DEMOS = Object.freeze([
  ['quill', 'Quill 富文本编辑', '需要富文本输入与 HTML/纯文本导出时直接嵌入 Quill。'],
  [
    'ag-grid',
    'AG Grid Community 数据表格',
    '专业网格交互（排序 / 过滤 / 虚拟滚动）直接交给 AG Grid。'
  ],
  ['leaflet', 'Leaflet 地图', '地图瓦片、标记与交互用真实容器挂载 Leaflet。'],
  ['codemirror', 'CodeMirror 6 代码编辑', '代码输入、语法高亮与编辑器生态直接复用 CodeMirror 6。'],
  ['markdown-viewer', 'Toast UI Viewer Markdown 查看', 'Markdown 排版渲染交给 Toast UI Viewer。']
]);

const INTEROP_POLICY = Object.freeze([
  '第三方库不需要支持服务端渲染：统一在客户端经 vClientOnly 加载，服务端只输出占位。',
  '第三方库使用自身原生 API 初始化、更新与销毁；yoya-ui 只提供真实 DOM 容器与生命周期边界。',
  '第三方依赖只作为示例站 devDependency，不进入 yoya-ui 运行时依赖。'
]);

export function InteropOverviewPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-interop-overview');
        page.attr('data-interop-overview', 'true');
        page.header((header) => {
          header.h1('第三方扩展：真实 DOM 互操作');
          header.p(
            '做胶水，不做轮子：下面是五类独立 JS 库与 yoya-ui 同树共存的演示，' +
              '每个演示都走同一条互操作路径。'
          );
        });

        page.section((demoSection) => {
          demoSection.h2('演示清单');
          INTEROP_DEMOS.forEach(([key, title, description]) => {
            demoSection.div((item) => {
              item.className('components-interop-overview-item');
              item.attr('data-interop-demo', key);
              item.strong(title);
              item.p(description);
            });
          });
        });

        page.section((policySection) => {
          policySection.h2('集成约束');
          policySection.ul((list) => {
            INTEROP_POLICY.forEach((policy) => list.li(policy));
          });
          policySection.pre((pre) => {
            pre.className('interop-policy-signature');
            pre.code(
              [
                'import { vClientOnly } from "@yoyaflow/yoya-ui";',
                '',
                '// 任何第三方 demo/组件都这样接入：',
                'page.child(vClientOnly(() => thirdPartyDemo.render()));'
              ].join('\n')
            );
          });
        });
      });
    }
  };
}
