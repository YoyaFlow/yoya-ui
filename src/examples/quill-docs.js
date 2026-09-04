import { interopPageFrame } from './interop-section.js';
import { QuillEditorExample, QuillEditorNode } from './demos/quill-editor.js';

const quillDemo = Object.freeze({
  id: 'quill',
  title: 'Quill 富文本编辑器',
  description:
    'Quill 以原生 API 挂载到真实 DOM 容器：编辑器自带工具栏与格式能力，页面壳通过演示组件方法读取内容。',
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
    lead: '后端管理、内容运营与文档场景的富文本输入，直接嵌入独立的 Quill，不引入框架适配层。',
    usage: [
      '需要富文本输入（标题、列表、链接、格式工具栏）。',
      '编辑器内容需要导出为 HTML 或纯文本交给业务逻辑。',
      '想展示「第三方 DOM 库 + vClientOnly」的标准互操作写法。'
    ],
    note: 'Quill 不需要支持服务端渲染：初始化只发生在客户端 renderDom 阶段，页面组合处用 vClientOnly 包住；销毁时同步释放实例。',
    demos: [quillDemo]
  });
}
