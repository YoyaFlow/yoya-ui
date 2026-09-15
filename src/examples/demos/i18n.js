import {
  createI18n,
  getI18n,
  installI18nStringShortcut,
  ref,
  registerI18n,
  unregisterI18n,
  vLanguageSwitch,
  vstack
} from '../../index.js';

export function I18nReactiveExample1() {
  const locale = createI18n({
    language: 'zh-CN',
    storageKey: 'yoya-ui:i18n-demo-language',
    messages: {
      'zh-CN': {
        title: '服务控制台',
        greeting: '你好，{name}',
        status: '运行中',
        currentLanguage: '当前语言'
      },
      en: {
        title: 'Service Console',
        greeting: 'Hello, {name}',
        status: 'Running',
        currentLanguage: 'Current language'
      }
    }
  });
  const language = ref(locale.getLanguage());

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.h3('服务控制台'.s('title', locale));
        stack.p('你好，{name}'.s('greeting', { name: 'Ada' }, locale));
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前语言'.s('currentLanguage', locale));
              row.spacer();
              row.output((output) => output.child(language));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('运行中'.s('status', locale));
            });
          stack.child(
            vLanguageSwitch({
              locale,
              onChange: () => (language.value = locale.getLanguage())
            })
          );
          });
    }
  };
}

export function I18nParamsExample1() {
  let count = 1;
  const locale = createI18n({
    fallbackLanguage: 'zh-CN',
    language: 'zh-CN',
    messages: {
      'zh-CN': {
        page: {
          stats: {
            users: '用户数：{count}'
          }
        },
        status: {
          unknown: '未知状态'
        }
      },
      en: {
        page: {
          stats: {
            users: 'Users: {count}'
          }
        }
      }
    }
  });

  const userCount = '用户数：{count}'.s('page.stats.users', { count }, locale);
  const unknownStatus = '未知状态'.s('status.unknown', locale);

  return {
    render() {
      return vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('词典支持 dot path 和 {param} 插值，未注册语言内容会回退到默认语言内容。');
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('统计');
              row.spacer();
              row.output((output) => output.child(userCount));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('回退状态');
              row.spacer();
              row.output((output) => output.child(unknownStatus));
            });
          stack.vButton('数量 +1', (button) => {
            button.on('click', () => {
              count += 1;
              userCount.params({ count });
            });
          });
          stack.vButton('中文', (button) => {
            button.variant('secondary');
            button.on('click', () => locale.setLanguage('zh-CN'));
          });
          stack.vButton('English', (button) => {
            button.on('click', () => locale.setLanguage('en'));
          });
          stack.vButton('注册英文补丁', (button) => {
            button.variant('primary');
            button.on('click', () => {
              locale.register('en', {
                status: {
                  unknown: 'Unknown status'
                }
              });
            });
          });
          });
    }
  };
}

export function I18nShortcutExample1() {
  const locale = createI18n({
    language: 'zh-CN',
    messages: {
      'zh-CN': {
        'save.message': '保存成功',
        'greeting.message': '你好，{name}'
      },
      en: {
        'save.message': 'Saved',
        'greeting.message': 'Hello, {name}'
      }
    }
  });

  return {
    render() {
      installI18nStringShortcut(locale);
      const saveMessage = '保存成功'.s('save.message');
      const greeting = '你好，{name}'.s('greeting.message', { name: 'Ada' });

      return vstack((stack) => {
            stack.style('gap', '14px');
            stack.p(
              'installI18nStringShortcut 让字符串可以直接通过 s(key, params) 变成响应式文本。'
            );
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('消息');
              row.spacer();
              row.output((output) => output.child(saveMessage));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('问候');
              row.spacer();
              row.output((output) => output.child(greeting));
            });
          stack.vButton('中文', (button) => {
            button.variant('secondary');
            button.on('click', () => locale.setLanguage('zh-CN'));
          });
          stack.vButton('English', (button) => {
            button.variant('primary');
            button.on('click', () => locale.setLanguage('en'));
          });
          });
    }
  };
}

export function I18nExtendExample1() {
  const locale = createI18n({
    language: 'zh-CN',
    messages: {
      'zh-CN': {
        currentLanguage: '当前语言',
        greeting: '你好，{name}',
        status: '运行中',
        title: '扩展新语言'
      },
      en: {
        currentLanguage: 'Current language',
        greeting: 'Hello, {name}',
        status: 'Running',
        title: 'Extend language'
      }
    }
  });
  const language = ref(locale.getLanguage());
  const languageSwitch = vLanguageSwitch({
    locale,
    languages: [
      { label: '中文', value: 'zh-CN' },
      { label: 'English', value: 'en' }
    ],
    onChange: () => (language.value = locale.getLanguage())
  });
  let jaAdded = false;
  let addButton = null;

  const addJapanese = () => {
    if (jaAdded) {
      return;
    }

    jaAdded = true;
    locale.register('ja', {
      currentLanguage: '現在の言語',
      greeting: 'こんにちは、{name}',
      status: '実行中',
      title: '言語を追加'
    });
    languageSwitch.languages([
      { label: '中文', value: 'zh-CN' },
      { label: 'English', value: 'en' },
      { label: '日本語', value: 'ja' }
    ]);
    addButton?.label('已添加日语');
    addButton?.disabled(true);
  };

  return {
    render() {
      return vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vLanguageSwitch 接受任意 languages，可以先 register 词典，再把它加入下拉项。');
            stack.p('你好，{name}'.s('greeting', { name: 'Ada' }, locale));
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前语言'.s('currentLanguage', locale));
              row.spacer();
              row.output((output) => output.child(language));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('运行中'.s('status', locale));
            });
          stack.child(languageSwitch);
          stack.vButton('添加日语', (button) => {
            addButton = button;
            button.variant('primary');
            button.on('click', addJapanese);
          });
          });
    }
  };
}

export function I18nGlobalExample1() {
  const locale = createI18n({
    key: 'console',
    language: 'zh-CN',
    messages: {
      'zh-CN': { greeting: '你好，{name}', registryState: '注册表状态' },
      en: { greeting: 'Hello, {name}', registryState: 'Registry state' }
    }
  });
  const registryState = ref('console · 已安装');
  let installed = true;
  let toggleButton = null;

  const toggleInstall = () => {
    installed = !installed;
    if (installed) {
      registerI18n(locale);
    } else {
      unregisterI18n(locale);
    }
    registryState.value = `console · ${installed ? '已安装' : '未安装'}`;
    toggleButton?.label(installed ? '注销全局实例' : '重新安装');
  };

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '14px');
        stack.p('配置 key 的实例会自动进入全局注册表，其他模块用 getI18n(key) 取回同一个实例。');
        stack.p('你好，{name}'.s('greeting', { name: 'Ada' }, locale));
        stack.hstack((row) => {
          row.style('alignItems', 'center');
          row.span('注册表状态'.s('registryState', locale));
          row.spacer();
          row.output((output) => output.child(registryState));
        });
        stack.vButton('中文', (button) => {
          button.variant('secondary');
          button.on('click', () => getI18n(locale.key())?.setLanguage('zh-CN'));
        });
        stack.vButton('English', (button) => {
          button.on('click', () => getI18n(locale.key())?.setLanguage('en'));
        });
        stack.vButton('注销全局实例', (button) => {
          toggleButton = button;
          button.variant('primary');
          button.on('click', toggleInstall);
        });
      });
    }
  };
}