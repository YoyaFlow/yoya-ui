import {
  createI18n,
  installI18nStringShortcut,
  vCard,
  vLanguageSwitch,
  vText
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
  const language = vText(locale.getLanguage());

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader(locale.text('title'));
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p(locale.text('greeting', { name: 'Ada' }));
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span(locale.text('currentLanguage'));
              row.spacer();
              row.output((output) => output.child(language));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span(locale.text('status'));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.child(
            vLanguageSwitch({
              locale,
              onChange: () => language.textContent(locale.getLanguage())
            })
          );
        });
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
  const userCount = locale.text('page.stats.users', { count });
  const unknownStatus = locale.text('status.unknown');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('参数与回退');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('词典支持 dot path 和 {param} 插值，缺失文案会回退到 fallbackLanguage。');
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
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('数量 +1');
            button.on('click', () => {
              count += 1;
              userCount.params({ count });
            });
          });
          footer.vButton((button) => {
            button.label('中文');
            button.variant('secondary');
            button.on('click', () => locale.setLanguage('zh-CN'));
          });
          footer.vButton((button) => {
            button.label('English');
            button.on('click', () => locale.setLanguage('en'));
          });
          footer.vButton((button) => {
            button.label('注册英文补丁');
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

  installI18nStringShortcut(locale);

  const saveMessage = '保存成功'.s('save.message');
  const greeting = '你好，{name}'.s('greeting.message', { name: 'Ada' });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('字符串快捷写法');
        card.vCardBody((body) => {
          body.vstack((stack) => {
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
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('中文');
            button.variant('secondary');
            button.on('click', () => locale.setLanguage('zh-CN'));
          });
          footer.vButton((button) => {
            button.label('English');
            button.variant('primary');
            button.on('click', () => locale.setLanguage('en'));
          });
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
  const language = vText(locale.getLanguage());
  const languageSwitch = vLanguageSwitch({
    locale,
    languages: [
      { label: '中文', value: 'zh-CN' },
      { label: 'English', value: 'en' }
    ],
    onChange: () => language.textContent(locale.getLanguage())
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
      return vCard((card) => {
        card.vCardHeader(locale.text('title'));
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vLanguageSwitch 接受任意 languages，可以先 register 词典，再把它加入下拉项。');
            stack.p(locale.text('greeting', { name: 'Ada' }));
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span(locale.text('currentLanguage'));
              row.spacer();
              row.output((output) => output.child(language));
            });
            stack.hstack((row) => {
              row.style('alignItems', 'center');
              row.span(locale.text('status'));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.child(languageSwitch);
          footer.vButton((button) => {
            addButton = button;
            button.label('添加日语');
            button.variant('primary');
            button.on('click', addJapanese);
          });
        });
      });
    }
  };
}
