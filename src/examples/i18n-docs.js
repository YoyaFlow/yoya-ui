import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  I18nExtendExample1,
  I18nParamsExample1,
  I18nReactiveExample1,
  I18nShortcutExample1
} from './demos/i18n.js';

const i18nDemoDefinitions = Object.freeze([
  {
    id: 'reactive',
    title: '响应式翻译',
    description: 'vLanguageSwitch 提供预制下拉切换，语言列表可扩展，选择会写入对应存储。',
    component: I18nReactiveExample1,
    sourceComponent: I18nReactiveExample1,
    imports: ['createI18n', 'vCard', 'vLanguageSwitch', 'vText'],
    sourceTitle: '响应式翻译核心源码'
  },
  {
    id: 'params',
    title: '参数与回退',
    description: '参数插值、增量注册和默认语言回退可以组合使用。',
    component: I18nParamsExample1,
    sourceComponent: I18nParamsExample1,
    imports: ['createI18n', 'vCard'],
    sourceTitle: '参数与回退核心源码'
  },
  {
    id: 'shortcut',
    title: '字符串快捷写法',
    description: '字符串默认文案配合 s(key) 获得响应式翻译节点。',
    component: I18nShortcutExample1,
    sourceComponent: I18nShortcutExample1,
    imports: ['createI18n', 'installI18nStringShortcut', 'vCard'],
    sourceTitle: '字符串快捷写法核心源码'
  },
  {
    id: 'extend',
    title: '扩展新语言',
    description: '动态注册词典，再通过 languages() 把新语言加入 vLanguageSwitch。',
    component: I18nExtendExample1,
    sourceComponent: I18nExtendExample1,
    imports: ['createI18n', 'vCard', 'vLanguageSwitch', 'vText'],
    sourceTitle: '扩展新语言核心源码'
  }
]);

export function I18nDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-i18n-docs');
        page.attr('data-component-route-item', 'guides:i18n');
        page.attr('data-i18n-docs', 'i18n');

        page.header((header) => {
          header.className('components-i18n-docs-header');
          header.h1('I18n 国际化');
          header.p(
            'createI18n 负责语言、词典、订阅通知和持久化，I18nTextNode 让文本随语言变化自动刷新。'
          );
        });

        page.section((usage) => {
          usage.className('components-i18n-docs-usage');
          usage.attr('data-i18n-usage', 'true');
          usage.h2('何时使用');
          usage.p('需要多语言文案、参数插值或按模块拆分语料时使用国际化管理器。');
          usage.ul((list) => {
            list.li('管理后台需要在中英文之间切换。');
            list.li('语言选择需要保存到 localStorage，刷新后恢复。');
            list.li('需要统一语言切换入口时使用 vLanguageSwitch，下拉列表可以扩展任意语言。');
            list.li('文案包含名称、数量等运行时参数。');
            list.li('语料按页面或模块拆分，运行时增量合并。');
            list.li('语言变化时只更新文本节点，不重建整个视图树。');
            list.li('JSON 语料可以直接 import 注册，YAML/TOML 等先解析成对象再注册。');
            list.li(
              '演示文案优先使用 “默认语言内容”.s(key, locale?)，未注册语言内容回退默认文案。'
            );
          });
        });

        page.section((api) => {
          api.className('components-i18n-docs-api');
          api.h2('常用 API');
          api.p('语言切换、翻译取值、响应式文本和语料注册都由同一个 I18n 实例管理。');
          api.pre((pre) => {
            pre.className('i18n-api-signature');
            pre.code(
              "createI18n({ language: 'zh-CN', fallbackLanguage: 'zh-CN', storageKey: 'yoya-ui:language', messages: { 'zh-CN': {}, en: {} } })"
            );
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              [
                [
                  'createI18n({ language, fallbackLanguage, messages })',
                  '创建独立国际化实例。',
                  "createI18n({ language: 'en', messages: { en: {} } })"
                ],
                [
                  'locale.setLanguage(language)',
                  '切换语言并通知文本节点刷新。',
                  "locale.setLanguage('en')"
                ],
                [
                  'createI18n({ storageKey, storage })',
                  '把语言保存到 localStorage 或自定义存储。',
                  "createI18n({ language: 'zh-CN', storageKey: 'yoya-ui:language' })"
                ],
                [
                  'locale.clearPersistedLanguage()',
                  '清除已保存的语言选择。',
                  'locale.clearPersistedLanguage()'
                ],
                [
                  'vLanguageSwitch({ locale, languages, onChange })',
                  '创建预制下拉语言切换按钮。',
                  "vLanguageSwitch({ locale, languages: ['zh-CN', 'en', 'ja', 'ko'] })"
                ],
                [
                  'locale.t(key, params, defaultValue)',
                  '同步翻译，支持 dot path 和参数替换。',
                  "locale.t('page.title', { name: 'Ada' })"
                ],
                [
                  'locale.text(key, params, defaultValue)',
                  '创建随语言自动刷新的文本节点。',
                  "locale.text('greeting', { name: 'Ada' })"
                ],
                [
                  'locale.register(language, messages)',
                  '增量合并某个语言的词典。',
                  "locale.register('en', { status: { online: 'Online' } })"
                ],
                [
                  'locale.registerMessages(corpus)',
                  '注册一个或多个语料文件，JSON 可直接注册，YAML 等先解析为对象。',
                  'locale.registerMessages([commonCorpus, pageCorpus])'
                ],
                [
                  'installI18nStringShortcut(locale)',
                  '启用字符串 s(key, params) 快捷写法。',
                  'installI18nStringShortcut(locale)'
                ],
                [
                  '"内容".s(key, params?, locale?)',
                  '用默认语言内容创建响应式文本，可显式指定 locale。',
                  "'你好，{name}'.s('greeting', { name: 'Ada' }, locale)"
                ]
              ].forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });

          api.p('语料文件注册：JSON 可以直接 import，YAML/TOML 等先解析成 JS 对象。');
          api.pre((pre) => {
            pre.className('i18n-api-signature');
            pre.code(`import zh from './locales/zh.json';
import en from './locales/en.json';

i18n.registerMessages([zh, en]);`);
          });
          api.pre((pre) => {
            pre.className('i18n-api-signature');
            pre.code(`import { parse } from 'yaml';
import enYaml from './locales/en.yaml?raw';

i18n.registerMessages(parse(enYaml));`);
          });
        });

        page.section((examples) => {
          examples.className('components-i18n-docs-examples');
          examples.h2('代码演示');
          examples.p('四个示例分别展示响应式翻译、参数回退、字符串快捷写法，以及如何扩展新语言。');
          i18nDemoDefinitions.forEach((demo) => {
            examples.child(I18nExampleSection(demo));
          });
        });
      });
    }
  };
}

function I18nExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-i18n-demo');
        example.attr('data-i18n-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-i18n-demo-live');
          live.attr('data-i18n-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
