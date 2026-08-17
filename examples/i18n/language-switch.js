import { createI18n, installI18nStringShortcut, section } from '../../src/index.js';
import demoCorpus from './locales/demo.json';
import featureCorpus from './locales/feature.json';

const languageOptions = [
  ['zh-CN', 'language.zh'],
  ['en', 'language.en'],
  ['mn', 'language.mn']
];

/**
 * 渲染 I18n 语言切换示例，演示 "内容".s("content-key") 快捷写法。
 */
export function renderI18nLanguageSwitchExample(target = '#app') {
  const locale = createI18n({
    language: 'zh-CN',
    fallbackLanguage: 'zh-CN',
    messages: [demoCorpus, featureCorpus]
  });
  const languageButtons = new Map();
  let copyStatus = null;

  installI18nStringShortcut(locale);

  const updateLanguageButtons = (language) => {
    languageButtons.forEach((button, code) => {
      const active = code === language;
      button.attr('aria-pressed', active ? 'true' : 'false');
      button.attr('data-active', active ? 'true' : null);
    });
  };

  const root = section((page) => {
    page.id('i18n-language-switch').className('i18n-shell');

    page.header((header) => {
      header.className('i18n-header');
      header.h1('语言切换演示'.s('demo.title'));
      header.p((intro) => {
        intro.id('i18n-intro');
        intro.child('使用 I18nTextNode 和字符串快捷写法实现无感语言切换。'.s('demo.intro'));
      });
    });

    page.nav((nav) => {
      nav.className('language-tabs').attr('aria-label', 'Language switcher');
      languageOptions.forEach(([language, labelKey]) => {
        nav.button((button) => {
          languageButtons.set(language, button);
          button.attr('type', 'button');
          button.attr('data-language', language);
          button.attr('aria-pressed', language === locale.getLanguage() ? 'true' : 'false');
          button.child(labelKey.s(labelKey));
          button.on('click', () => {
            locale.setLanguage(language);
            updateLanguageButtons(language);
          });
        });
      });
    });

    page.p((status) => {
      status.id('current-language');
      status.className('language-status');
      status.child('当前语言：中文'.s('language.current'));
    });

    page.section((panel) => {
      panel.className('syntax-panel');
      panel.h2('核心写法'.s('panel.title'));
      panel.pre((codeBlock) => {
        codeBlock.code('"内容".s("content-key")'.s('panel.code'));
      });
      panel.button((button) => {
        button.id('copy-syntax');
        button.attr('type', 'button');
        button.child('复制写法'.s('action.copy'));
        button.on('click', () => {
          copyStatus.textContent(locale.t('action.copied'));
        });
      });
      panel.output((status) => {
        status.id('copy-status');
        copyStatus = status;
      });
    });

    page.ul((list) => {
      list.id('feature-list');
      list.className('feature-list');
      list.li('字符串默认文案：内容'.s('feature.default'));
      list.li('语言和词典由外部 I18n 实例控制'.s('feature.external'));
      list.li('切换语言时只刷新 ViewTextNode'.s('feature.reactive'));
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderI18nLanguageSwitchExample('#app');
}
