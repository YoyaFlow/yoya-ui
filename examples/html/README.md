# HTML 基础元素示例

这个目录用于测试 `src/html/index.js` 导出的基础 HTML 工厂函数的常用写法。

全量 HTML 元素覆盖由 `src/html/html.test.js` 保障；这里保留轻量示例，便于在浏览器中验证父元素快捷 DSL。

覆盖内容按高频场景分组：

- 页面结构：`header`、`nav`、`section`、`article`、`aside`、`footer`
- 文本语义：`h1`、`h2`、`h3`、`p`、`strong`、`em`、`code`、`mark`、`small`、`time`
- 列表导航：`ul`、`li`、`a`
- 表单交互：`form`、`fieldset`、`legend`、`label`、`input`、`select`、`option`、`textarea`、`output`、`button`
- 数据表格：`table`、`caption`、`thead`、`tbody`、`tr`、`th`、`td`
- 媒体状态：`figure`、`img`、`figcaption`、`details`、`summary`、`progress`、`meter`

事件和动态效果：

- `input` 的 `input` 事件实时更新 `output` 预览和状态文案。
- `button` 的 `click` 事件更新保存状态，并把 `progress` 推到完成值。

命名约定：

- `varTag()` 创建 `<var>`，避免和 JS `var` 关键字冲突。
- `page.styleTag()` 创建子 `<style>`，避免覆盖节点已有的 `.style()` 样式设置方法。

运行方式：

```bash
npm run examples:html
```

然后打开 Vite 输出的地址，访问 `/examples/html/index.html`。
