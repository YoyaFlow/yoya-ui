/**
 * yoya-ui core type declarations.
 *
 * The library ships plain JavaScript; these declarations describe the public
 * contract so TypeScript consumers get editor IntelliSense and compile-time
 * checks. They mirror the runtime API in `src/core`.
 */

import type { CodeBlock } from './data-display.js';
import type { DynamicLoaderNode, DynamicLoaderOptions } from './async.js';
import type { HtmlElementNode } from './html.js';
import type { VThemeShell } from './layout.js';
import type { Router } from './router.js';
import type { VThemeModeSwitch } from './theme.js';

// ---------------------------------------------------------------------------
// Shared primitive types
// ---------------------------------------------------------------------------

/** Class name input accepted by className()/class(): strings, arrays, falsy values. */
export type ClassNameInput = string | number | null | undefined | false | ClassNameInput[];

/** Attribute values supported by attr(). */
export type AttrValue = string | number | boolean | null | undefined;

/** Inline style values supported by style()/styles(). */
export type StyleValue = string | number | null | undefined;

/** Inline style map; keys are camelCase CSS property names. */
export type StyleInput = Record<string, StyleValue>;

/** Options accepted by on(). */
export type EventOptions = boolean | AddEventListenerOptions;

/** Event handler signature used across the library. */
export type EventHandler<E extends Event = Event> = (event: E) => void;

/** A component object with a render() method (form B component). */
export interface ComponentLike {
  render(): ViewNode;
  [key: string]: any;
}

/** Anything accepted as a child: nodes, components, text, arrays, empty values. */
export type ChildInput =
  ViewNode | string | number | ComponentLike | null | undefined | ChildInput[];

/** Declarative setup callback receiving the node. */
export type SetupCallback<N> = (node: N) => void;

/**
 * Object-form setup accepted by every factory: class/className, attrs, style,
 * children, onXxx event handlers and arbitrary attribute keys.
 */
export interface ElementOptions {
  class?: ClassNameInput;
  className?: ClassNameInput;
  attrs?: Record<string, AttrValue>;
  style?: StyleInput;
  children?: ChildInput;
  [key: `on${string}`]: EventHandler | undefined;
  [key: string]: unknown;
}

/** Unified setup input: callback, node instance, text, object config or children. */
export type SetupInput<N = ViewNode> =
  N | string | number | SetupCallback<N> | ElementOptions | ChildInput;

/**
 * Signature shared by every element/component factory. Supports the three
 * declarative forms: `factory(callback)`, `factory(text, callback)`,
 * `factory(first, options, callback)` and plain object config.
 */
export interface ElementFactory<N = ViewNode> {
  (first?: SetupInput<N> | null): N;
  (first: SetupInput<N>, callback: SetupCallback<N>): N;
  (first: SetupInput<N> | null, options: ElementOptions, callback?: SetupCallback<N>): N;
}

/** State types accepted by registerStateAttrs(). */
export type StateType = 'boolean' | 'string' | 'number' | null | undefined;

/** State handler invoked when a registered state changes. */
export type StateHandler<N = ViewNode> = (value: unknown, node: N, oldValue: unknown) => void;

// ---------------------------------------------------------------------------
// View tree nodes
// ---------------------------------------------------------------------------

/**
 * ViewNode is the base view-tree node: children, event cleanup, state and
 * lifecycle management shared by every node kind.
 */
export class ViewNode {
  constructor(setup?: SetupInput<ViewNode> | null);

  /** Unified initialization: function, text, node instance or object config. */
  setup(setup: SetupInput<ViewNode> | null): this;

  /** Returns a snapshot of child nodes. */
  children(): ViewNode[];

  /** Removes and schedules all children for destruction. */
  clearChildren(): this;

  /** Adds children; strings/numbers are wrapped into text nodes. */
  child(...children: ChildInput[]): this;

  /** Adds a text child. */
  text(content: string | number): this;

  /** Registers an event listener, bound immediately or at render time. */
  on(eventName: string, handler: EventHandler, options?: EventOptions): this;

  /** Declares state fields (default boolean) recognized by this node. */
  registerStateAttrs(...attrs: Array<string | Record<string, StateType>>): this;

  /** Registers a handler invoked when the given state changes. */
  registerStateHandler(stateName: string, handler: StateHandler<this>): this;

  /** Sets a state value and triggers its handlers. */
  setState(stateName: string, value?: unknown): this;

  getState(stateName: string): unknown;
  getBooleanState(stateName: string): boolean;
  getStringState(stateName: string): string;
  getNumberState(stateName: string): number;

  /** Renders (or re-renders) the real DOM node. */
  renderDom(): Node | null;

  /** Alias of renderDom(); commits the current tree to the DOM. */
  commit(): Node | null;

  /** Mounts the node into a selector or DOM container. */
  bindTo(target: string | ParentNode): this;

  /** Destroys the node: cleans events, destroys children and removes its DOM. */
  destroy(): this;

  /** Serializes this subtree to an HTML string (SSR path). */
  toHTML(): string;

  /** Post-hydration hook; subclasses may read state back from real DOM. */
  hydrateSnapshot(): this;
}

/** Text node backed by a real Text node. */
export class VTextNode extends ViewNode {
  constructor(content?: string | number);

  textContent(): string;
  textContent(value: string | number): this;

  renderDom(): Text | null;
  toHTML(): string;
}

/**
 * ComponentNode lazily resolves a factory function or a component object with
 * render() and reuses the resolved node.
 */
export class ComponentNode extends ViewNode {
  constructor(component: ComponentLike);

  children(): ViewNode[];
  textContent(): string;
  renderDom(): Node | null;
  toHTML(): string;
  destroy(): this;
}

/**
 * ElementNode renders a real DOM Element and synchronizes attrs, classes,
 * styles, events and children.
 */
export class ElementNode extends ViewNode {
  constructor(tagName: string, setup?: SetupInput<ElementNode> | null);

  tagName(): string;

  /** Aggregated text content of this element and its children. */
  textContent(): string;

  /** Reads an attribute value. */
  attr(name: string): AttrValue | undefined;
  /** Sets a single attribute; null/undefined/false remove it. */
  attr(name: string, value: AttrValue): this;
  /** Sets multiple attributes. */
  attr(attrs: Record<string, AttrValue>): this;

  id(): AttrValue | undefined;
  id(value: string): this;

  name(): AttrValue | undefined;
  name(value: string): this;

  /** Reads the joined class name. */
  className(): string;
  /** Adds classes; supports space-separated strings, arrays and multiple args. */
  className(...classes: ClassNameInput[]): this;

  class(...classes: ClassNameInput[]): this;

  replaceClassName(old: string, next: string, tolerate?: boolean): this;

  /** Reads a single style property. */
  style(name: string): StyleValue | undefined;
  /** Sets a single style property; null/undefined/'' remove it. */
  style(name: string, value: StyleValue): this;
  /** Sets multiple styles. */
  style(styles: StyleInput): this;

  /** Sets multiple styles. */
  styles(styles: StyleInput): this;

  child(...children: ChildInput[]): this;

  renderDom(): Element | null;
  toHTML(): string;

  // Shortcuts registered on ElementNode (inherited by HtmlElementNode).
  /** vStateNode shortcut: creates a stateful object component. */
  vStateNode(config: StateNodeConfig): StateNodeComponent;
  /** vDynamicLoader shortcut: lazily loads a module with status views. */
  vDynamicLoader(
    first?: DynamicLoaderOptions | (() => unknown) | SetupCallback<DynamicLoaderNode>,
    options?: ElementOptions,
    callback?: SetupCallback<DynamicLoaderNode>
  ): DynamicLoaderNode;
  /** vThemeShell shortcut: themed surface container. */
  vThemeShell(
    first?: SetupInput<VThemeShell> | null,
    options?: ElementOptions,
    callback?: SetupCallback<VThemeShell>
  ): VThemeShell;
  /** codeBlock shortcut: code block with copy button (inherited by HtmlElementNode). */
  codeBlock(
    first?: SetupInput<CodeBlock> | null,
    options?: ElementOptions,
    callback?: SetupCallback<CodeBlock>
  ): CodeBlock;
  /** vThemeModeSwitch shortcut: theme light/dark/system switcher. */
  vThemeModeSwitch(
    first?: SetupInput<VThemeModeSwitch> | null,
    options?: ElementOptions,
    callback?: SetupCallback<VThemeModeSwitch>
  ): VThemeModeSwitch;
  /** vRouter shortcut: declarative router container. */
  vRouter(
    first?: SetupInput<Router> | null,
    options?: ElementOptions,
    callback?: SetupCallback<Router>
  ): Router;
  /** vLink shortcut: router link. */
  vLink(
    routerInstance: Router,
    setup?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  /** vRouterView shortcut: current route outlet. */
  vRouterView(
    routerInstance: Router,
    setup?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
  /** vRouterViews shortcut: multi-outlet router view. */
  vRouterViews(
    routerInstance: Router,
    setup?: SetupInput<HtmlElementNode> | null,
    callback?: SetupCallback<HtmlElementNode>
  ): HtmlElementNode;
}

// ---------------------------------------------------------------------------
// Node helpers
// ---------------------------------------------------------------------------

/** Creates a factory for the given tag using ElementNode or a subclass. */
export function createElementFactory(
  tagName: string,
  NodeClass?: new (tagName: string, setup?: unknown) => ElementNode
): ElementFactory;

/** Applies { attrs, style } options to a node (component object support). */
export function applyElementOptions(
  node: ViewNode | ComponentLike,
  options: ElementOptions | null
): ViewNode | ComponentLike;

/** Minimal HTML escaping used by toHTML(). */
export function escapeHtml(value: unknown): string;

/** Normalizes any child input into a ViewNode. */
export function normalizeChild(child: ViewNode | ComponentLike | string | number): ViewNode;

/** Normalizes (first, second, third) factory arguments into { first, options, callback }. */
export function normalizeSetupArguments(
  first?: unknown,
  second?: unknown,
  third?: unknown
): { first: unknown; options: unknown; callback: unknown };

/** Registers factories as parent shortcut methods on a node class. */
export function registerChildFactories(
  NodeClass: new (...args: any[]) => ViewNode,
  factories: Record<string, (...args: any[]) => ViewNode>,
  options?: { override?: boolean }
): void;

/** Resolves a mount target: CSS selector string or DOM container. */
export function resolveTarget(target: string | ParentNode): ParentNode | null;

/** Creates a text node. */
export function vText(content?: string | number): VTextNode;
/** Alias of vText(). */
export const text: typeof vText;

// ---------------------------------------------------------------------------
// Client-only (SSR placeholder)
// ---------------------------------------------------------------------------

/** Node that renders a placeholder during SSR and loads content on hydration. */
export class ClientOnlyNode extends ViewNode {
  constructor(loader: () => Promise<unknown> | unknown);
  toHTML(): string;
  renderDom(): Node | null;
  children(): ViewNode[];
  textContent(): string;
  destroy(): this;
}

/** Creates a client-only node; the loader runs only on the client. */
export function vClientOnly(loader: () => Promise<unknown> | unknown): ClientOnlyNode;

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

  /** Registers one or more corpora: multi-language files or { language, messages }. */
  registerMessages(corpus?: Record<string, unknown> | Array<unknown>): this;

  /** Translates a key with dot-path lookup, fallback language and {name} params. */
  t(key: string, params?: Record<string, unknown>, defaultValue?: unknown): string;

  /** Creates a text node that refreshes when the language changes. */
  text(key: string, params?: Record<string, unknown>, defaultValue?: unknown): I18nTextNode;

  /** Subscribes to language changes; returns an unsubscribe function. */
  subscribe(listener: (i18n: I18n) => void): () => void;
}

/** Text node bound to an I18n instance; refreshes on language changes. */
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
// State node (vStateNode)
// ---------------------------------------------------------------------------

export interface StateNodeConfig<S extends Record<string, unknown> = Record<string, unknown>> {
  state?: S | (() => S);
  render(state: S, component: StateNodeComponent<S>): ChildInput;
  update?(state: S, component: StateNodeComponent<S>, changed: Set<string>): boolean | void;
  [key: string]: any;
}

/** Object component returned by vStateNode(). */
export interface StateNodeComponent<S extends Record<string, unknown> = Record<string, unknown>> {
  destroy(): StateNodeComponent<S>;
  getState(): S;
  render(): ElementNode;
  setState(
    patch: Partial<S> | ((state: S) => Partial<S> | null | undefined)
  ): StateNodeComponent<S>;
  state(): S;
  subscribe(listener: (state: S, component: StateNodeComponent<S>) => void): () => void;
  [key: string]: any;
}

/** Creates a stateful object component with render/update lifecycle. */
export function vStateNode<S extends Record<string, unknown> = Record<string, unknown>>(
  config: StateNodeConfig<S>
): StateNodeComponent<S>;

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** 请求传输层：RequestBase.submit() 会调用它，返回统一包装结构（如 Result.from 的 raw）。 */
export type RequestSubmit = (request: RequestCommand) => unknown;

/** 注册请求传输层；传 null 清除注册。 */
export function configureRequest(options?: { submit?: RequestSubmit | null }): RequestSubmit | null;

/** 请求实例：描述请求与映射，方法由 RequestBase 或子类提供。 */
export interface RequestCommand {
  address(): string;
  method(): string;
  headers(): Record<string, string>;
  cookies(): string | null;
  body(): unknown;
  params(): Record<string, unknown>;
  submit(): unknown;
  toItem?: (row: unknown) => unknown;
  toDetail?: (data: unknown) => unknown;
  [key: string]: unknown;
}

/** 请求基类：定义请求描述与提交的默认逻辑，子类覆写或扩展。 */
export class RequestBase {
  method(): string;
  headers(): Record<string, string>;
  cookies(): string | null;
  body(): unknown;
  params(): Record<string, unknown>;
  address(): string;
  submit(): unknown;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type ResultKind = 'detail' | 'list' | 'page';

/** 统一返回结构：自动判断 detail / list / page 并完成映射，失败时 from 抛错。 */
export class Result<T = unknown> {
  ok: boolean;
  code: string;
  msg: string | null;
  showType: number;
  data: T;
  kind: ResultKind;
  pageNum: number | null;
  pageSize: number | null;
  total: number | null;
  readonly isSuccess: boolean;
  readonly pages: number;

  constructor(init?: Partial<Result<T>>);

  static from<T = unknown>(
    raw: unknown,
    command?: { toItem?: (item: unknown) => unknown; toDetail?: (data: unknown) => unknown }
  ): Result<T>;
}

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

/** Binds a document-level event listener (outside click, drag, Escape, scroll). */
export function bindDocumentEvent(
  type: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions | boolean
): () => void;

/** Removes a document-level event listener. */
export function unbindDocumentEvent(
  type: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions | boolean
): void;

/** Binds a window-level global listener (scroll / resize / popstate). */
export function bindWindowEvent(
  type: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions | boolean
): () => void;

/** Injects a <style> into <head>; dataAttribute is used for dedup and identification. */
export function injectDocumentStyle(styleText: string, dataAttribute?: string | null): HTMLStyleElement | null;

/** Initializes theme mode/name from explicit values or persisted storage. */
export function initYoyaTheme(options?: InitYoyaThemeOptions): {
  mode: YoyaMode;
  theme: string;
};

declare global {
  interface String {
    /**
     * i18n string shortcut: "default text".s(key, paramsOrLocale?, maybeLocale?).
     * The locale argument may be an I18n instance or a registered locale key.
     */
    s(
      key: string,
      paramsOrLocale?: Record<string, unknown> | I18n | string,
      maybeLocale?: I18n | string
    ): I18nTextNode;
  }
}
