# I18n 语言切换示例

这个目录演示 `I18nTextNode` 和字符串快捷写法：

```js
'内容'.s('content-key')
```

约定：

- 字符串本身是默认文案。
- `.s()` 的参数是翻译 key。
- 语言包由外部 `I18n` 实例注册，支持嵌套 JSON。
- 多个语料库文件可以用数组传入 `messages` 后自动深度合并。
- 当前语言由外部 `locale.setLanguage()` 控制。
- 切换语言时只刷新文本节点，不重建外层 `ViewNode` 树。

当前示例把语料库拆成两份文件：

- `locales/demo.json`：标题、介绍、代码面板和操作文案。
- `locales/feature.json`：语言按钮和特性列表文案。

运行方式：

```bash
npm run examples:i18n
```

然后打开 Vite 输出的地址，访问 `/examples/i18n/index.html`。
