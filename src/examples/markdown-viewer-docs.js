import { interopPageFrame } from './interop-section.js';
import { MarkdownViewerDemoNode, MarkdownViewerExample } from './demos/markdown-viewer.js';

const MARKDOWN_DEMO = Object.freeze({
  id: 'markdown-viewer',
  description: '查看器渲染标题、列表与代码块；按钮在「互操作概览」与「发布说明」两篇文档间切换。',
  component: MarkdownViewerExample,
  sourceComponent: MarkdownViewerDemoNode,
  imports: ['HtmlElementNode'],
  extraSource: [
    "import Viewer from '@toast-ui/editor/viewer';",
    "import '@toast-ui/editor/dist/toastui-editor-viewer.css';"
  ].join('\n'),
  sourceTitle: 'Toast UI Viewer 胶水类源码',
  outputText: '当前展示互操作概览文档，可切换到发布说明。',
  controls: [
    {
      label: '切换发布说明',
      run: (live, output) => {
        live.setMarkdown(
          [
            '## 0.3.x 发布说明',
            '',
            '- 内置路由 / i18n / 主题 / 状态管理',
            '- SSR 同构渲染与 vClientOnly 互操作模式',
            '- 零运行时依赖'
          ].join('\n')
        );
        output.textContent('已切换到发布说明。');
      }
    },
    {
      label: '切回互操作概览',
      run: (live, output) => {
        live.setMarkdown(
          [
            '## Markdown 查看',
            '',
            '第三方 Markdown 查看器与 ECharts 一样，',
            '通过真实 DOM 挂载进 yoya-ui 视图树。'
          ].join('\n')
        );
        output.textContent('已切回互操作概览。');
      }
    }
  ]
});

export function MarkdownViewerDocumentationPage() {
  return interopPageFrame({
    docsKey: 'markdown-viewer',
    heading: 'Toast UI Viewer Markdown 查看',
    lead: '文档、说明页与富内容展示需要 Markdown 排版时，用 Toast UI Viewer 保持渲染一致。',
    usage: [
      '需要把 Markdown 文案渲染为排版文档（标题、列表、代码块）。',
      '内容来自业务侧且会动态切换。',
      '希望查看器与编辑能力来自同一生态。'
    ],
    note: 'Viewer 只在客户端创建并经 vClientOnly 挂载；切换内容调用 setMarkdown，销毁时释放实例。',
    demos: [MARKDOWN_DEMO]
  });
}
