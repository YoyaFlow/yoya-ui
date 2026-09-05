import { interopPageFrame } from './interop-section.js';
import { MarkdownViewerDemoNode, MarkdownViewerExample } from './demos/markdown-viewer.js';

const MARKDOWN_DEMO = Object.freeze({
  id: 'markdown-viewer',
  description:
    '编辑模式为“左编辑右查看”：左侧 Markdown 源码实时同步到右侧渲染；查看模式隐藏编辑器，只读展示整篇内容。',
  component: MarkdownViewerExample,
  sourceComponent: MarkdownViewerDemoNode,
  imports: ['HtmlElementNode'],
  extraSource: [
    "import Editor from '@toast-ui/editor';",
    "import Viewer from '@toast-ui/editor/viewer';",
    "import '@toast-ui/editor/dist/toastui-editor.css';",
    "import '@toast-ui/editor/dist/toastui-editor-viewer.css';",
    "import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';"
  ].join('\n'),
  sourceTitle: 'Toast UI Viewer 胶水类源码',
  usageImports: [{ from: './demos/markdown-viewer.js', names: ['MarkdownViewerDemoNode'] }],
  usageTitle: 'Markdown 查看使用案例源码',
  outputText: '当前为编辑模式：左侧编辑 Markdown，右侧实时查看渲染结果。',
  controls: [
    {
      label: '编辑模式',
      run: (live, output) => {
        live.setMode('edit');
        output.textContent('编辑模式：左侧 Markdown 源码，右侧实时预览。');
      }
    },
    {
      label: '查看模式',
      run: (live, output) => {
        live.setMode('view');
        output.textContent('查看模式：只读渲染整篇 Markdown。');
      }
    }
  ]
});

export function MarkdownViewerDocumentationPage() {
  return interopPageFrame({
    docsKey: 'markdown-viewer',
    heading: 'Toast UI Viewer Markdown 查看',
    lead:
      '同一份 Markdown 可在编辑与查看间切换：编辑模式左编辑右预览，查看模式只读渲染，排版交给 Toast UI。',
    usage: [
      '需要把 Markdown 文案渲染为排版文档（标题、列表、代码块）。',
      '内容来自业务侧且会动态切换。',
      '希望查看器与编辑能力来自同一生态。'
    ],
    note:
      'Editor 与 Viewer 都在客户端创建并经 vClientOnly 挂载；编辑模式的 change 事件把 Markdown 实时同步给右侧 Viewer。明暗配色使用 Toast UI 自带的 theme 选项：深色导入 toastui-editor-dark.css，不再从 yoya-ui 侧改写配色。',
    demos: [MARKDOWN_DEMO]
  });
}
