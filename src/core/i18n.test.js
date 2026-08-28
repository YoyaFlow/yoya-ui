import { describe, expect, it } from 'vitest';
import * as yoya from '../index.js';

describe('I18n', () => {
  it('creates reactive text nodes backed by ViewTextNode', () => {
    expect(yoya.ViewTextNode).toBe(yoya.VTextNode);
    expect(yoya.I18n).toBeTypeOf('function');

    const locale = new yoya.I18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': {
          greeting: '你好，{name}'
        },
        en: {
          greeting: 'Hello, {name}'
        }
      }
    });

    const node = locale.text('greeting', { name: 'Ada' });

    expect(node).toBeInstanceOf(yoya.I18nTextNode);
    expect(node).toBeInstanceOf(yoya.ViewTextNode);
    expect(node.textContent()).toBe('你好，Ada');

    locale.setLanguage('en');

    expect(node.textContent()).toBe('Hello, Ada');
  });

  it('switches rendered DOM and HTML output without rebuilding the view tree', () => {
    document.body.innerHTML = '<main id="app"></main>';

    const locale = yoya.createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': {
          page: {
            title: '控制台',
            intro: '欢迎回来，{name}'
          }
        },
        en: {
          page: {
            title: 'Console',
            intro: 'Welcome back, {name}'
          }
        }
      }
    });

    const root = yoya.div((page) => {
      page.h1(locale.text('page.title'));
      page.p(locale.text('page.intro', { name: 'Ada' }));
    });

    root.bindTo('#app');

    expect(document.querySelector('#app').textContent).toBe('控制台欢迎回来，Ada');
    expect(root.toHTML()).toBe('<div><h1>控制台</h1><p>欢迎回来，Ada</p></div>');

    locale.setLanguage('en');

    expect(document.querySelector('#app').textContent).toBe('ConsoleWelcome back, Ada');
    expect(root.toHTML()).toBe('<div><h1>Console</h1><p>Welcome back, Ada</p></div>');
  });

  it('supports message registration, fallback language, and param refresh', () => {
    const locale = yoya.createI18n({
      language: 'en',
      fallbackLanguage: 'zh-CN',
      messages: {
        'zh-CN': {
          save: '保存 {count} 项'
        }
      }
    });

    const node = locale.text('save', { count: 1 });

    expect(locale.t('missing.key')).toBe('missing.key');
    expect(node.textContent()).toBe('保存 1 项');

    locale.register('en', {
      save: 'Save {count} items'
    });
    node.params({ count: 3 });

    expect(node.textContent()).toBe('Save 3 items');
  });

  it('merges nested JSON messages from multiple corpus files', () => {
    const commonCorpus = {
      'zh-CN': {
        common: {
          save: '保存',
          cancel: '取消'
        }
      },
      en: {
        common: {
          save: 'Save',
          cancel: 'Cancel'
        }
      }
    };
    const pageCorpus = {
      'zh-CN': {
        page: {
          title: '控制台',
          stats: {
            users: '用户数：{count}'
          }
        }
      },
      en: {
        page: {
          title: 'Console',
          stats: {
            users: 'Users: {count}'
          }
        }
      }
    };

    const locale = yoya.createI18n({
      language: 'zh-CN',
      messages: [commonCorpus, pageCorpus]
    });

    expect(locale.t('common.save')).toBe('保存');
    expect(locale.t('page.title')).toBe('控制台');
    expect(locale.t('page.stats.users', { count: 3 })).toBe('用户数：3');

    locale.setLanguage('en');

    expect(locale.t('common.cancel')).toBe('Cancel');
    expect(locale.t('page.stats.users', { count: 5 })).toBe('Users: 5');
  });

  it('registers single-language corpus files and arrays per language', () => {
    const locale = yoya.createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': [
          {
            page: {
              title: '页面标题'
            }
          },
          {
            page: {
              subtitle: '页面副标题'
            }
          }
        ]
      }
    });

    locale.registerMessages([
      {
        language: 'en',
        messages: {
          page: {
            title: 'Page Title'
          }
        }
      },
      {
        language: 'en',
        messages: {
          page: {
            subtitle: 'Page Subtitle'
          }
        }
      }
    ]);

    expect(locale.t('page.title')).toBe('页面标题');
    expect(locale.t('page.subtitle')).toBe('页面副标题');

    locale.setLanguage('en');

    expect(locale.t('page.title')).toBe('Page Title');
    expect(locale.t('page.subtitle')).toBe('Page Subtitle');
  });

  it('supports String.prototype s shortcut for reactive text', () => {
    const locale = yoya.createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': {
          'content-key': '内容',
          'hello-key': '你好，{name}'
        },
        en: {
          'content-key': 'Content',
          'hello-key': 'Hello, {name}'
        }
      }
    });

    yoya.installI18nStringShortcut(locale);

    const translatedNode = '内容'.s('content-key');
    const paramNode = '你好，{name}'.s('hello-key', { name: 'Ada' });
    const fallbackNode = '默认内容'.s('missing-key');

    expect(translatedNode).toBeInstanceOf(yoya.I18nTextNode);
    expect(translatedNode.textContent()).toBe('内容');
    expect(paramNode.textContent()).toBe('你好，Ada');
    expect(fallbackNode.textContent()).toBe('默认内容');

    locale.setLanguage('en');

    expect(translatedNode.textContent()).toBe('Content');
    expect(paramNode.textContent()).toBe('Hello, Ada');
    expect(fallbackNode.textContent()).toBe('默认内容');
  });

  it('keeps locale and language controlled by the external I18n instance', () => {
    const locale = yoya.createI18n({
      language: 'en',
      messages: {
        en: {
          greeting: 'Hello, {name}'
        },
        'zh-CN': {
          greeting: '你好，{name}'
        }
      }
    });

    yoya.installI18nStringShortcut(locale);

    const node = '你好，{name}'.s('greeting', { name: 'Ada' });

    expect(node.textContent()).toBe('Hello, Ada');

    locale.setLanguage('zh-CN');

    expect(node.textContent()).toBe('你好，Ada');
  });

  it('allows the s shortcut to specify an explicit locale', () => {
    const defaultLocale = yoya.createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': {
          greeting: '默认问候'
        }
      }
    });
    const locale = yoya.createI18n({
      language: 'zh-CN',
      messages: {
        'zh-CN': {
          greeting: '你好，{name}',
          status: '运行中'
        },
        en: {
          greeting: 'Hello, {name}',
          status: 'Running'
        }
      }
    });

    yoya.installI18nStringShortcut(defaultLocale);

    const defaultNode = '默认内容'.s('missing-key');
    const statusNode = '运行中'.s('status', locale);
    const paramNode = '你好，{name}'.s('greeting', { name: 'Ada' }, locale);

    expect(defaultNode.textContent()).toBe('默认内容');
    expect(statusNode.textContent()).toBe('运行中');
    expect(paramNode.textContent()).toBe('你好，Ada');

    locale.setLanguage('en');

    expect(statusNode.textContent()).toBe('Running');
    expect(paramNode.textContent()).toBe('Hello, Ada');
    expect(defaultNode.textContent()).toBe('默认内容');
  });

  it('persists language through localStorage with storageKey', () => {
    const storageKey = 'yoya-ui:test-language';
    localStorage.removeItem(storageKey);

    const first = yoya.createI18n({
      language: 'zh-CN',
      storageKey,
      messages: {
        'zh-CN': { greeting: '你好' },
        en: { greeting: 'Hello' }
      }
    });

    first.setLanguage('en');

    expect(localStorage.getItem(storageKey)).toBe('en');

    const second = yoya.createI18n({
      language: 'zh-CN',
      storageKey
    });

    expect(second.getLanguage()).toBe('en');

    second.clearPersistedLanguage();

    expect(localStorage.getItem(storageKey)).toBeNull();

    const third = yoya.createI18n({
      language: 'zh-CN',
      storageKey
    });

    expect(third.getLanguage()).toBe('zh-CN');
  });

  it('supports custom storage adapters', () => {
    const values = new Map();
    const storage = {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
      removeItem(key) {
        values.delete(key);
      }
    };

    const locale = yoya.createI18n({
      language: 'zh-CN',
      storage,
      storageKey: 'language'
    });

    locale.setLanguage('en');

    const restored = yoya.createI18n({
      language: 'zh-CN',
      storage,
      storageKey: 'language'
    });

    expect(restored.getLanguage()).toBe('en');
  });

  it('ignores unavailable storage without throwing', () => {
    const storage = {
      getItem() {
        throw new Error('storage blocked');
      },
      setItem() {
        throw new Error('storage blocked');
      },
      removeItem() {
        throw new Error('storage blocked');
      }
    };

    const locale = yoya.createI18n({
      language: 'zh-CN',
      storage,
      storageKey: 'language'
    });

    expect(locale.getLanguage()).toBe('zh-CN');
    expect(() => locale.setLanguage('en')).not.toThrow();
    expect(locale.getLanguage()).toBe('en');
  });
});
