const MODES = ['light', 'dark', 'system'];
const STORAGE_MODE_KEY = 'yoya-theme-mode';
const STORAGE_THEME_KEY = 'yoya-theme-name';

function documentRoot() {
  return typeof document === 'undefined' ? null : document.documentElement;
}

function hasStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * 设置明暗模式（light / dark / system），作用于 documentElement 的 data-yoya-mode。
 * persist 为 true 时同时写入 localStorage，供下次会话恢复。
 */
export function setYoyaMode(mode = 'light', options = {}) {
  const next = MODES.includes(mode) ? mode : 'light';
  const root = documentRoot();

  if (root) {
    root.dataset.yoyaMode = next;
  }

  if (options.persist && hasStorage()) {
    try {
      localStorage.setItem(STORAGE_MODE_KEY, next);
    } catch {
      // 隐私模式或配额限制下忽略持久化失败。
    }
  }

  return next;
}

/**
 * 读取当前声明的模式；未声明时按主题默认值返回 light。
 */
export function getYoyaMode() {
  const root = documentRoot();
  const mode = root && root.dataset.yoyaMode;
  return MODES.includes(mode) ? mode : 'light';
}

/**
 * 解析实际生效的浅/深色：system 模式下跟随系统偏好（matchMedia）。
 */
export function resolveYoyaMode() {
  const mode = getYoyaMode();

  if (mode !== 'system') {
    return mode;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 设置命名品牌主题，作用于 documentElement 的 data-yoya-theme；传空值清除。
 */
export function setYoyaTheme(name = '', options = {}) {
  const root = documentRoot();

  if (!name) {
    if (root) {
      delete root.dataset.yoyaTheme;
    }
    if (options.persist && hasStorage()) {
      try {
        localStorage.removeItem(STORAGE_THEME_KEY);
      } catch {
        // 隐私模式或配额限制下忽略持久化失败。
      }
    }
    return '';
  }

  if (root) {
    root.dataset.yoyaTheme = name;
  }
  if (options.persist && hasStorage()) {
    try {
      localStorage.setItem(STORAGE_THEME_KEY, name);
    } catch {
      // 隐私模式或配额限制下忽略持久化失败。
    }
  }

  return name;
}

/**
 * 读取当前品牌主题；未设置时返回空字符串。
 */
export function getYoyaTheme() {
  const root = documentRoot();
  return (root && root.dataset.yoyaTheme) || '';
}

/**
 * 初始化主题：显式传入的 mode/theme 优先；未传入且允许持久化时从
 * localStorage 恢复上次选择，再应用到 documentElement。返回 { mode, theme }。
 */
export function initYoyaTheme(options = {}) {
  let mode = options.mode;
  let theme = options.theme;

  if (mode === undefined && hasStorage()) {
    const storedMode = localStorage.getItem(STORAGE_MODE_KEY);
    if (MODES.includes(storedMode)) {
      mode = storedMode;
    }
  }

  if (theme === undefined && hasStorage()) {
    theme = localStorage.getItem(STORAGE_THEME_KEY) || '';
  }

  if (mode !== undefined) {
    setYoyaMode(mode, { persist: options.persist });
  }
  if (theme !== undefined) {
    setYoyaTheme(theme, { persist: options.persist });
  }

  return { mode: getYoyaMode(), theme: getYoyaTheme() };
}
