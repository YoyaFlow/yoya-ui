import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  I18nExtendExample1,
  I18nGlobalExample1,
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
    imports: ['createI18n', 'ref', 'vLanguageSwitch', 'vstack'],
    sourceTitle: '响应式翻译核心源码'
  },
  {
    id: 'params',
    title: '参数与回退',
    description: '参数插值支持 ref 句柄自动刷新，增量注册和默认语言回退可以组合使用。',
    component: I18nParamsExample1,
    sourceComponent: I18nParamsExample1,
    imports: ['createI18n', 'ref', 'vstack'],
    sourceTitle: '参数与回退核心源码'
  },
  {
    id: 'shortcut',
    title: '字符串快捷写法',
    description: '字符串默认文案配合 s(key) 获得响应式翻译节点。',
    component: I18nShortcutExample1,
    sourceComponent: I18nShortcutExample1,
    imports: ['createI18n', 'installI18nStringShortcut', 'vstack'],
    sourceTitle: '字符串快捷写法核心源码'
  },
  {
    id: 'global',
    title: '安装全局 locale',
    description: '配置 key 的实例自动进入全局注册表，任意模块用 getI18n(key) 取回同一个实例。',
    component: I18nGlobalExample1,
    sourceComponent: I18nGlobalExample1,
    imports: [
      'computed',
      'createI18n',
      'getI18n',
      'ref',
      'registerI18n',
      'unregisterI18n',
      'vstack'
    ],
    sourceTitle: '安装全局 locale 核心源码'
  },
  {
    id: 'extend',
    title: '扩展新语言',
    description: '动态注册词典，再通过 languages() 把新语言加入 vLanguageSwitch。',
    component: I18nExtendExample1,
    sourceComponent: I18nExtendExample1,
    imports: ['createI18n', 'ref', 'vLanguageSwitch', 'vstack'],
    sourceTitle: '扩展新语言核心源码'
  }
]);

export function I18nDocumentationPage() {
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
        list.li('演示文案优先使用 “默认语言内容”.s(key, locale?)，未注册语言内容回退默认文案。');
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
              '同步翻译，支持 dot path、参数替换和 ref 句柄；句柄可进 computed / 区域。',
              "locale.t('page.title', { name })"
            ],
            [
              'locale.text(key, params, defaultValue)',
              '创建随语言自动刷新的文本节点；插值参数支持 ref 句柄自动刷新。',
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
              'createI18n({ key })',
              '创建带 key 的实例，并自动注册进全局 locale 注册表。',
              "createI18n({ key: 'app', language: 'zh-CN' })"
            ],
            [
              'getI18n(key)',
              '按 key 取回全局注册的 locale 实例，未找到返回 null。',
              "getI18n('app')"
            ],
            [
              'registerI18n(instance) / unregisterI18n(keyOrInstance)',
              '手动安装或注销全局 locale 实例。',
              "unregisterI18n('app')"
            ],
            [
              'installI18nStringShortcut(locale)',
              '启用字符串 s(key, params) 快捷写法。',
              'installI18nStringShortcut(locale)'
            ],
            [
              '"内容".s(key, params?, locale?)',
              '用默认语言内容创建响应式文本；插值参数支持 ref 句柄。',
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

      api.h3('ref / computed 与插值参数');
      api.p(
        '插值参数可以直接传 signal 句柄。locale.text() / "文案".s() 内部用 peek 读取并自行订阅：参数写入与语言切换都原地刷新文本，也不会把参数泄漏成区域依赖。'
      );
      api.p(
        'locale.t() 内部用追踪读：句柄可以进入 computed 或区域 builder，依赖收集照常工作；computed 的结果句柄放进文本值位置即建立绑定。'
      );
      api.pre((pre) => {
        pre.className('i18n-api-signature');
        pre.code(`const count = ref(1);

// 路径一：文本节点 —— 参数 + 语言都自动刷新（推荐）
el.span('保存 {count} 项'.s('save', { count }, locale));

// 路径二：computed 派生 —— 信号变化重算，值位置原地更新
const label = computed(() => locale.t('save', { count }));
el.span(label);

count.value += 1; // 两条路径都会自动更新，区域不需要重跑`);
      });
      api.table((table) => {
        table.thead((head) => {
          head.tr((row) => {
            row.th('写法');
            row.th('参数更新');
            row.th('语言切换');
            row.th('区域重跑');
          });
        });
        table.tbody((body) => {
          [
            ["'…'.s(key, { count }, locale) / locale.text()", '原地刷新', '原地刷新', '不需要'],
            ['computed(() => locale.t(key, { count }))', '原地刷新', '不触发', '不需要'],
            ['locale.t(key, { count }) 字符串直写', '仅区域重跑时', '仅区域重跑时', '需要']
          ].forEach(([write, paramUpdate, languageSwitch, rerun]) => {
            body.tr((row) => {
              row.td((cell) => cell.code(write));
              row.td(paramUpdate);
              row.td(languageSwitch);
              row.td(rerun);
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
      examples.p(
        '五个示例分别展示响应式翻译、参数回退、字符串快捷写法、全局 locale 注册表，以及如何扩展新语言。'
      );
      i18nDemoDefinitions.forEach((demo) => {
        examples.child(I18nExampleSection(demo));
      });
    });
  });
}

function I18nExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

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
