import { interopPageFrame } from './interop-section.js';
import { QuillEditorExample, QuillEditorNode } from './demos/quill-editor.js';

const quillDemo = Object.freeze({
  id: 'quill',
  description:
    '在下方输入并排版内容，用「导出 HTML / 导出纯文本」读取结果；离开页面时编辑器实例自动释放。',
  component: QuillEditorExample,
  sourceComponent: QuillEditorNode,
  imports: ['HtmlElementNode'],
  extraSource: "import Quill from 'quill';\nimport 'quill/dist/quill.snow.css';",
  sourceTitle: 'Quill 胶水类源码',
  outputText: '点击按钮读取编辑器内容。',
  controls: [
    {
      label: '导出 HTML',
      run: (live, output) => output.textContent(live.html() || '（内容为空）')
    },
    {
      label: '导出纯文本',
      run: (live, output) => output.textContent(live.text().trim() || '（内容为空）')
    }
  ]
});

export function QuillDocumentationPage() {
  return interopPageFrame({
    docsKey: 'quill',
    heading: 'Quill 富文本编辑器',
    lead: '后台内容编辑需要富文本输入时，与其在组件库里再造编辑器，不如把 Quill 直接挂到真实 DOM 上。',
    usage: [
      '需要富文本输入（标题、列表、链接、格式工具栏）。',
      '编辑器内容需要导出为 HTML 或纯文本交给业务逻辑。',
      '想展示「第三方 DOM 库 + vClientOnly」的标准互操作写法。'
    ],
    note: 'Quill 只在客户端初始化并经 vClientOnly 挂载，无需为其做 SSR 适配；销毁时释放引用并随节点移除。',
    demos: [quillDemo]
  });
}
