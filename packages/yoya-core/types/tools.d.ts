/**
 * `@yoyaflow/yoya-core/tools` 的声明：辅助子系统（a11y + i18n）。
 *
 * 这两族**不在核心入口的默认面**里——主入口只留渲染必需的原语；要用工具的地方从这里 import，
 * 打包器才不会把 i18n 拖进每个应用。
 */
import { VTextNode } from './core.js';

// ---
// Accessibility primitives
// ---

export interface FocusTrapOptions {
  onEscape?: (event: Event) => void;
  restoreFocus?: boolean;
}

export interface FocusTrapHandle {
  activate(): void;
  destroy(): void;
}

export function getFocusableElements(root: Element | null | undefined): Element[];
export function createFocusTrap(
  root: Element | null | undefined,
  options?: FocusTrapOptions
): FocusTrapHandle;
export function announce(
  message: string,
  options?: { politeness?: 'polite' | 'assertive'; dedupeKey?: string }
): HTMLElement | null;
export function moveByKey(options: {
  key: string;
  items: readonly unknown[];
  currentIndex?: number;
  shiftKey?: boolean;
}): number;

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

export interface I18nOptions {
  /** Stable identifier for this locale context; enables registry lookup and multi-locale persistence. */
  key?: string;
  language?: string;
  fallbackLanguage?: string;
  storageKey?: string | null;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  messages?: Record<string, unknown>;
}

/** Minimal i18n manager: language, dictionaries, subscriptions, persistence. */
export class I18n {
  constructor(options?: I18nOptions);

  /** Returns this instance's locale key, or null when not configured. */
  key(): string | null;
  getLanguage(): string;
  setLanguage(language: string): this;
  getFallbackLanguage(): string;
  setFallbackLanguage(language: string): this;
  clearPersistedLanguage(): this;

  /** Registers or merges a dictionary for one language. */
  register(language: string, messages?: Record<string, unknown>): this;

  /** Lazily registers a language; returns a promise resolved after merge and notify. */
  registerLocale(
    name: string,
    loader: () => Record<string, unknown> | Promise<Record<string, unknown>>
  ): Promise<this>;

  /** Registers one or more corpora: multi-language files or { language, messages }. */
  registerMessages(corpus?: Record<string, unknown> | Array<unknown>): this;

  /**
   * Translates a key with dot-path lookup, fallback language and {name} params.
   * Signal params use tracked reads, so t() composes with computed() and regions.
   */
  t(key: string, params?: Record<string, unknown>, defaultValue?: unknown): string;

  /** Creates a text node that refreshes on language changes; signal params refresh in place. */
  text(key: string, params?: Record<string, unknown>, defaultValue?: unknown): I18nTextNode;

  /** Subscribes to language changes; returns an unsubscribe function. */
  subscribe(listener: (i18n: I18n) => void): () => void;
}

/** Text node bound to an I18n instance; refreshes on language changes and signal param writes. */
export class I18nTextNode extends VTextNode {
  constructor(i18n: I18n, key: string, params?: Record<string, unknown>, defaultValue?: unknown);

  key(): string;
  key(value: string): this;
  params(): Record<string, unknown>;
  params(value: Record<string, unknown>): this;
  defaultValue(): unknown;
  defaultValue(value: unknown): this;
  refresh(): this;
  destroy(): this;
}

/** Creates an I18n instance. */
export function createI18n(options?: I18nOptions): I18n;

/** Default shared I18n instance. */
export const i18n: I18n;

/** Registers an I18n instance by its key; returns an unregister function. */
export function registerI18n(instance: I18n): () => void;

/** Removes an I18n instance from the registry (accepts a key or instance). */
export function unregisterI18n(keyOrInstance: string | I18n): string | undefined;

/** Looks up a registered I18n instance by key; returns null when missing. */
export function getI18n(key: string): I18n | null;

/** Returns a copy of the registry as { key: instance }. */
export function listI18n(): Map<string, I18n>;

/** Reads all persisted locale identifiers ({ key: language }) from the shared record. */
export function getPersistedI18nLocales(
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
): Record<string, string>;

/** Creates a translated text node on the default instance. */
export function i18nText(key: string, params?: Record<string, unknown>): I18nTextNode;

/** Installs the "content".s(key, locale?) string shortcut; returns the locale. */
export function installI18nStringShortcut(locale?: I18n): I18n;

/** Runs build() with the string shortcut scoped to the given I18n instance. */
export function withI18nStringShortcut<T>(locale: I18n, build: () => T): T;

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type YoyaMode = 'light' | 'dark' | 'system';

export interface ThemePersistOptions {
  persist?: boolean;
}

export interface InitYoyaThemeOptions extends ThemePersistOptions {
  mode?: YoyaMode;
  theme?: string;
}

/** Sets the light/dark/system mode on documentElement; returns the applied mode. */
export function setYoyaMode(mode?: YoyaMode, options?: ThemePersistOptions): YoyaMode;
export function getYoyaMode(): YoyaMode;
export function resolveYoyaMode(): 'light' | 'dark';

/** Sets or clears the named brand theme on documentElement; returns the theme name. */
export function setYoyaTheme(name?: string, options?: ThemePersistOptions): string;
export function getYoyaTheme(): string;

/** Initializes theme mode/name from explicit values or persisted storage. */
export function initYoyaTheme(options?: InitYoyaThemeOptions): {
  mode: YoyaMode;
  theme: string;
};

// ---------------------------------------------------------------------------
// Component authoring helpers
// ---------------------------------------------------------------------------
// 这一族（`createComponentShortcut` / `applyComponentSetup` / `themeValue` …）在 0.8 之前
// 没有单独的类型声明，运行期从本入口导出；类型面待补。

// 唯一有类型的一条：实现与声明都在主入口，这里只是同一绑定的再导出。
export { applyElementOptions } from './core.js';
