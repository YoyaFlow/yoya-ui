import { interopPageFrame } from './interop-section.js';
import { QuillEditorExample, QuillEditorNode } from './demos/quill-editor.js';

const quillDemo = Object.freeze({
  id: 'quill',
  description:
    '全宽编辑区提供字号、字体、颜色、对齐、缩进、代码块、图片与公式等常用操作；「导出 HTML / 导出纯文本」读取内容。',
  component: QuillEditorExample,
  sourceComponent: QuillEditorNode,
  imports: ['HtmlElementNode'],
  extraSource: [
    "import Quill from 'quill';",
    "import 'quill/dist/quill.snow.css';",
    "import '../quill-dark.css';"
  ].join('\n'),
  sourceTitle: 'Quill 胶水类源码',
  usageImports: [{ from: './demos/quill-editor.js', names: ['QuillEditorNode'] }],
  usageTitle: 'Quill 使用案例源码',
  outputText: '在编辑区内直接排版，用导出按钮读取内容。',
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
    note:
      'Quill 只在客户端初始化并经 vClientOnly 挂载，无需 SSR 适配。暗色样式独立在 quill-dark.css（不引用 yoya-ui 配色），由宿主类跟随页面浅色 / 深色 / 系统切换。',
    demos: [quillDemo]
  });
}
