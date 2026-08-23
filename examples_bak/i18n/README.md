# I18n 语言切换示例

这个目录演示 `I18nTextNode` 和字符串快捷写法：

```js
'内容'.s('content-key')
```

下面是一个不依赖外部语言包文件的完整模块，可以直接复制到 `language-switcher.js`。把语言包换成业务词典即可复用。

```js
import { createI18n, installI18nStringShortcut, section } from 'yoya-ui';

const languageOptions = [
  ['zh-CN', '中文'],
  ['en', 'English']
];

export function renderLanguageSwitcherExample(target = '#app') {
  const locale = createI18n({
    language: 'zh-CN',
    fallbackLanguage: 'zh-CN',
    messages: {
      'zh-CN': {
        title: '语言切换',
        intro: '切换语言时只刷新文本节点。',
        current: '当前语言：中文',
        copy: '复制写法',
        copied: '已复制',
        syntax: '"内容".s("content-key")'
      },
      en: {
        title: 'Language switcher',
        intro: 'Changing language refreshes text nodes only.',
        current: 'Current language: English',
        copy: 'Copy syntax',
        copied: 'Copied',
        syntax: '"内容".s("content-key")'
      }
    }
  });
  const languageButtons = new Map();
  let copyStatus = null;

  installI18nStringShortcut(locale);

  const updateLanguageButtons = (language) => {
    languageButtons.forEach((button, code) => {
      button.attr('aria-pressed', code === language ? 'true' : 'false');
    });
  };

  const root = section((page) => {
    page.id('language-switcher');
    page.h1('语言切换'.s('title'));
    page.p('切换语言时只刷新文本节点。'.s('intro'));
    page.nav((nav) => {
      languageOptions.forEach(([language, label]) => {
        nav.button((button) => {
          languageButtons.set(language, button);
          button.attr('type', 'button').attr('aria-pressed', language === locale.getLanguage() ? 'true' : 'false');
          button.text(label);
          button.on('click', () => {
            locale.setLanguage(language);
            updateLanguageButtons(language);
          });
        });
      });
    });
    page.p((status) => status.child('当前语言：中文'.s('current')));
    page.pre((codeBlock) => codeBlock.code('"内容".s("content-key")'.s('syntax')));
    page.button((button) => {
      button.attr('type', 'button').child('复制写法'.s('copy'));
      button.on('click', () => {
        copyStatus.textContent(locale.t('copied'));
      });
    });
    page.output((output) => {
      copyStatus = output;
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderLanguageSwitcherExample('#app');
}
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
