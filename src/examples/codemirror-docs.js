import { interopPageFrame } from './interop-section.js';
import { CodeMirrorDemoNode, CodeMirrorExample } from './demos/codemirror-editor.js';

const CODE_DEMO = Object.freeze({
  id: 'codemirror',
  description: '直接编辑代码体验高亮；「写入示例片段」替换文档，「导出内容」显示当前全文。',
  component: CodeMirrorExample,
  sourceComponent: CodeMirrorDemoNode,
  imports: ['HtmlElementNode'],
  extraSource: [
    "import { EditorView, basicSetup } from 'codemirror';",
    "import { javascript } from '@codemirror/lang-javascript';"
  ].join('\n'),
  sourceTitle: 'CodeMirror 6 胶水类源码',
  outputText: '编辑器默认展示一段可编辑示例代码。',
  controls: [
    {
      label: '写入示例片段',
      run: (live, output) => {
        live.setValue('const api = "https://example.com";\nexport default api;');
        output.textContent('已写入示例片段。');
      }
    },
    {
      label: '导出内容',
      run: (live, output) => output.textContent(live.value())
    }
  ]
});

export function CodeMirrorDocumentationPage() {
  return interopPageFrame({
    docsKey: 'codemirror',
    heading: 'CodeMirror 6 代码编辑',
    lead: '配置页、代码片段与开发者工具需要带高亮的代码编辑时，直接复用 CodeMirror 6。',
    usage: [
      '页面需要带语法高亮的代码输入或查看。',
      '需要 CodeMirror 生态的补全、lint 与键位扩展。',
      '想让编辑器内容与外部状态双向同步。'
    ],
    note: 'CodeMirror 只在客户端创建 EditorView，经 vClientOnly 挂载；内容更新走 dispatch，销毁时调用 view.destroy。',
    demos: [CODE_DEMO]
  });
}
