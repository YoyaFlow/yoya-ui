import { VTextNode } from './node.js';

/** 多 key locale 共享存储的默认记录键。 */
const DEFAULT_LOCALES_STORAGE_KEY = 'yoya-ui:i18n';

/** 全局 I18n 实例注册表：key → 实例，供多 locale 场景按 key 查找与使用。 */
const i18nRegistry = new Map();

/**
 * I18n 是最小国际化管理器：负责语言、词典、订阅通知、持久化和文本翻译。
 */
export class I18n {
  constructor(options = {}) {
    const defaultLanguage = options.language || 'zh-CN';
    this._key = options.key || null;
    this._storage = resolveStorage(options.storage);
    this._storageKey = options.storageKey || null;
    this._sharedStorageKey = this._key ? DEFAULT_LOCALES_STORAGE_KEY : null;
    this._fallbackLanguage = options.fallbackLanguage || defaultLanguage;
    this._language = this._readStoredLanguage(defaultLanguage);
    this._messages = {};
    this._listeners = new Set();

    this.registerMessages(options.messages || {});

    if (this._key) {
      registerI18n(this);
    }
  }

  /** 返回该实例的 locale key；未配置时为 null。 */
  key() {
    return this._key;
  }

  getLanguage() {
    return this._language;
  }

  setLanguage(language) {
    if (!language || language === this._language) {
      return this;
    }

    this._language = language;
    this._persistLanguage();
    this._notify();
    return this;
  }

  getFallbackLanguage() {
    return this._fallbackLanguage;
  }

  setFallbackLanguage(language) {
    if (!language) {
      return this;
    }

    this._fallbackLanguage = language;
    this._notify();
    return this;
  }

  clearPersistedLanguage() {
    if (!this._storageKey) {
      if (!this._sharedStorageKey) {
        return this;
      }

      const record = readStorageRecord(this._storage, this._sharedStorageKey);
      delete record[this._key];
      writeStorageRecord(this._storage, this._sharedStorageKey, record);
      return this;
    }

    try {
      this._storage.removeItem(this._storageKey);
    } catch {
      // Storage 不可用时保持静默，不阻止界面切换。
    }

    return this;
  }

  /**
   * 注册或增量合并某个语言的词典。
   */
  register(language, messages = {}) {
    if (!language) {
      return this;
    }

    normalizeMessageList(messages).forEach((messagePart) => {
      this._messages[language] = mergeMessages(this._messages[language] || {}, messagePart);
    });
    this._notify();
    return this;
  }

  /**
   * 注册一个或多个语料库文件。
   * 支持 { "zh-CN": {...} } 多语言文件、{ language, messages } 单语言文件和数组。
   */
  registerMessages(corpus = {}) {
    normalizeCorpusList(corpus).forEach((corpusPart) => {
      if (corpusPart.language) {
        this.register(corpusPart.language, corpusPart.messages || {});
        return;
      }

      Object.entries(corpusPart).forEach(([language, messages]) => {
        this.register(language, messages);
      });
    });

    return this;
  }

  /**
   * 翻译 key。支持 dot path、fallback language、默认文案和 {name} 参数替换。
   */
  t(key, params = {}, defaultValue = undefined) {
    const message =
      readMessage(this._messages[this._language], key) ??
      readMessage(this._messages[this._fallbackLanguage], key) ??
      defaultValue ??
      key;

    const value = typeof message === 'function' ? message(params, this) : message;
    return interpolate(value, params);
  }

  /**
   * 创建随语言变化自动刷新的文本节点。
   */
  text(key, params = {}, defaultValue = undefined) {
    return new I18nTextNode(this, key, params, defaultValue);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _readStoredLanguage(defaultLanguage) {
    if (this._storageKey) {
      try {
        return this._storage.getItem(this._storageKey) || defaultLanguage;
      } catch {
        return defaultLanguage;
      }
    }

    if (this._sharedStorageKey) {
      const record = readStorageRecord(this._storage, this._sharedStorageKey);
      return record[this._key] || defaultLanguage;
    }

    return defaultLanguage;
  }

  _persistLanguage() {
    if (this._storageKey) {
      try {
        this._storage.setItem(this._storageKey, this._language);
      } catch {
        // Storage 不可用时保持静默，不阻止界面切换。
      }
      return;
    }

    if (this._sharedStorageKey) {
      // 共享记录写入整个 key 映射，多个 locale 标识被同时保存。
      const record = readStorageRecord(this._storage, this._sharedStorageKey);
      record[this._key] = this._language;
      writeStorageRecord(this._storage, this._sharedStorageKey, record);
    }
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}

/**
 * I18nTextNode 继承 VTextNode，语言变化时只更新文本节点内容。
 */
export class I18nTextNode extends VTextNode {
  constructor(i18n, key, params = {}, defaultValue = undefined) {
    super(i18n.t(key, params, defaultValue));
    this._i18n = i18n;
    this._key = key;
    this._params = params || {};
    this._defaultValue = defaultValue;
    this._unsubscribe = i18n.subscribe(() => this.refresh());
  }

  key(value) {
    if (value === undefined) {
      return this._key;
    }

    this._key = value;
    return this.refresh();
  }

  params(value) {
    if (value === undefined) {
      return { ...this._params };
    }

    this._params = value || {};
    return this.refresh();
  }

  defaultValue(value) {
    if (value === undefined) {
      return this._defaultValue;
    }

    this._defaultValue = value;
    return this.refresh();
  }

  refresh() {
    this.textContent(this._i18n.t(this._key, this._params, this._defaultValue));
    return this;
  }

  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    return super.destroy();
  }
}

export function createI18n(options = {}) {
  return new I18n(options);
}

export const i18n = createI18n();

export function i18nText(key, params = {}) {
  return i18n.text(key, params);
}

let stringShortcutI18n = i18n;

/**
 * 安装字符串快捷写法："内容".s("content-key")。
 * 字符串本身作为默认文案，参数作为翻译 key；未显式指定 locale 时使用安装的默认 I18n 实例。
 */
export function installI18nStringShortcut(locale = i18n) {
  stringShortcutI18n = locale;

  if (String.prototype._yoyaUiStringShortcutInstalled) {
    return locale;
  }

  Object.defineProperty(String.prototype, '_yoyaUiStringShortcutInstalled', {
    configurable: true,
    enumerable: false,
    value: true
  });

  Object.defineProperty(String.prototype, 's', {
    configurable: true,
    enumerable: false,
    value: function stringShortcut(key, paramsOrLocale, maybeLocale) {
      const defaultValue = String(this);
      let params = {};
      let locale = stringShortcutI18n;

      if (isLocaleLike(paramsOrLocale)) {
        locale = paramsOrLocale;
      } else if (typeof paramsOrLocale === 'string') {
        locale = getI18n(paramsOrLocale) || stringShortcutI18n;
      } else {
        params = paramsOrLocale || {};

        if (isLocaleLike(maybeLocale)) {
          locale = maybeLocale;
        } else if (typeof maybeLocale === 'string') {
          locale = getI18n(maybeLocale) || stringShortcutI18n;
        }
      }

      return locale.text(key || defaultValue, params, defaultValue);
    }
  });

  return locale;
}

/**
 * 在指定 I18n 实例作用域内执行构建，使字符串快捷写法 ".s()" 使用该实例；
 * 结束后恢复外层实例，共享单例不被请求修改。
 */
export function withI18nStringShortcut(locale, build) {
  const previous = stringShortcutI18n;
  stringShortcutI18n = locale || previous;
  try {
    return build();
  } finally {
    stringShortcutI18n = previous;
  }
}

function isLocaleLike(value) {
  return Boolean(value && typeof value.text === 'function');
}

/**
 * 注册 I18n 实例到全局注册表，按实例 key 索引；未配置 key 时不注册。
 * 返回取消注册函数。
 */
export function registerI18n(instance) {
  const key = instance?.key?.();
  if (!key) {
    return () => {};
  }

  i18nRegistry.set(key, instance);
  return () => {
    if (i18nRegistry.get(key) === instance) {
      i18nRegistry.delete(key);
    }
  };
}

/** 从全局注册表移除实例（接受 key 或实例）。 */
export function unregisterI18n(keyOrInstance) {
  const key = typeof keyOrInstance === 'string' ? keyOrInstance : keyOrInstance?.key?.();
  if (key) {
    i18nRegistry.delete(key);
  }
  return key;
}

/** 按 key 查找全局注册的 I18n 实例；未找到返回 null。 */
export function getI18n(key) {
  return key ? i18nRegistry.get(key) || null : null;
}

/** 返回全局注册的 { key: instance } 副本。 */
export function listI18n() {
  return new Map(i18nRegistry);
}

/** 读取多 key locale 共享存储中的全部标识（{ key: language }）。 */
export function getPersistedI18nLocales(storage) {
  const target = storage || resolveStorage();
  return readStorageRecord(target, DEFAULT_LOCALES_STORAGE_KEY);
}

function readStorageRecord(storage, key) {
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorageRecord(storage, key, record) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(record));
  } catch {
    // Storage 不可用时保持静默，不阻止界面切换。
  }
}

installI18nStringShortcut(i18n);

function readMessage(messages, key) {
  if (!messages || !key) {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(messages, key)) {
    return messages[key];
  }

  return String(key)
    .split('.')
    .reduce((value, part) => {
      if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, part)) {
        return value[part];
      }

      return undefined;
    }, messages);
}

function interpolate(value, params) {
  return String(value).replace(/\{([^{}]+)\}/g, (match, name) => {
    const paramValue = params?.[name.trim()];
    return paramValue === undefined || paramValue === null ? match : String(paramValue);
  });
}

function mergeMessages(target, source) {
  const next = { ...target };

  Object.entries(source || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergeMessages(next[key], value);
    } else {
      next[key] = value;
    }
  });

  return next;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeCorpusList(corpus) {
  return Array.isArray(corpus)
    ? corpus.flatMap((item) => normalizeCorpusList(item))
    : [corpus || {}];
}

function normalizeMessageList(messages) {
  return Array.isArray(messages)
    ? messages.flatMap((messagePart) => normalizeMessageList(messagePart))
    : [messages || {}];
}

function resolveStorage(storage) {
  if (storage) {
    return storage;
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // 隐私模式或受限环境下无法访问 localStorage，退回内存存储。
  }

  return memoryStorage();
}

const memoryStorageData = new Map();

function memoryStorage() {
  return {
    getItem(key) {
      return memoryStorageData.has(key) ? memoryStorageData.get(key) : null;
    },
    setItem(key, value) {
      memoryStorageData.set(key, String(value));
    },
    removeItem(key) {
      memoryStorageData.delete(key);
    }
  };
}
