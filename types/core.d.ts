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

/**
 * Zero-argument reader accepted in element value positions (attr / style /
 * styles / toggleClass / vText / mountable). It runs through the same binding
 * pipeline as a signal handle, so a signal it reads keeps the position live.
 */
export type ValueReader<T = unknown> = () => T;

/** Attribute values supported by attr(); handle or reader makes it a live binding. */
export type AttrValue =
  string | number | boolean | null | undefined | SignalHandle<unknown> | ValueReader<unknown>;

/** Inline style values supported by style()/styles(); handle or reader makes it live. */
export type StyleValue =
  string | number | null | undefined | SignalHandle<unknown> | ValueReader<unknown>;

/** Inline style map; keys are camelCase CSS property names. */
export type StyleInput = Record<string, StyleValue>;

/**
 * Text content accepted by vText(): a signal handle (recommended) or a
 * zero-argument reader makes it a live binding. Note that `child(fn)` is a
 * component render slot, not a text position — wrap readers in vText(fn).
 */
export type TextContent = string | number | SignalHandle<unknown> | ValueReader<unknown>;

/** Options accepted by on(). */
export type EventOptions = boolean | AddEventListenerOptions;

/** Event handler signature used across the library. */
export type EventHandler<E extends Event = Event> = (event: E) => void;

/** A component object with a render() method (form B component). */
export interface ComponentLike {
  render(): ViewNode;
  /**
   * Optional error-boundary member: ComponentNode declares it automatically,
   * so component-level failures degrade without affecting callers.
   */
  whenFailed?(
    error: unknown,
    info: {
      phase: 'build' | 'render' | 'event' | 'update';
      message: string;
      source: unknown;
      boundary: unknown;
    }
  ): ViewNode | ComponentLike | string | number | null | undefined | void;
  [key: string]: any;
}

/**
 * Anything accepted as a child: nodes, components, text, arrays, empty values.
 * A signal handle becomes a bound text node (equivalent to `vText(handle)`).
 */
export type ChildInput =
  | ViewNode
  | string
  | number
  | ComponentLike
  | SignalHandle<unknown>
  | null
  | undefined
  | ChildInput[];

/** Declarative setup callback receiving the node. */
export type SetupCallback<N> = (node: N) => void;

/**
 * Row-level update protocol for `keyed()`. Without it, a row whose reference
 * changed is destroyed and rebuilt; with it, equivalent rows keep their node and
 * genuinely changed rows can be updated in place.
 */
export interface KeyedRowUpdate<TRow = unknown> {
  /** Key matched but the reference changed: return true to reuse the node as-is. */
  equals?(previousRow: TRow, nextRow: TRow): boolean;
  /** Key matched and the row really changed: update the existing node in place. */
  update?(node: ViewNode, previousRow: TRow, nextRow: TRow): unknown;
}

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
  access?: AccessSpec;
  [key: `on${string}`]: EventHandler | undefined;
  [key: string]: unknown;
}

/**
 * Unified setup input: callback, node instance, text, signal handle (bound
 * text), object config or children.
 */
export type SetupInput<N = ViewNode> =
  N | string | number | SetupCallback<N> | ElementOptions | ChildInput;

/**
 * Signature shared by every element/component factory. Supports the three
 * declarative forms: `factory(callback)`, `factory(text, callback)`,
 * `factory(first, options, callback)` and plain object config. A signal handle
 * in the first position becomes bound text, like `child(handle)`.
 */
export interface ElementFactory<N = ViewNode> {
  (first?: SetupInput<N> | null): N;
  (first: SetupInput<N>, callback: SetupCallback<N>): N;
  (first: SetupInput<N> | null, options: ElementOptions, callback?: SetupCallback<N>): N;
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

export type AccessLevel = 'read' | 'write';

/** Permission code on a node. Components pass bare resource codes, e.g. "system:member"; read/write level is decided by the user's grants. */
export type AccessSpec = string;

/** Options accepted by createAccess(). */
export interface AccessOptions {
  /** Granted permission strings, e.g. ["r.system:member", "w.system:member"]. */
  permissions?: string[];
  /** Roles held by the current request, e.g. ["admin"]. */
  roles?: string[];
  /** Roles that bypass every check (default ["super_admin"]). */
  superAdmins?: string[];
}

/** Per-request permission context: decided by withAccess scope. */
export interface AccessContext {
  roles(): string[];
  permissions(): string[];
  isSuper(): boolean;
  /** True when any grant (bare / r. / w.) covers the code. */
  has(spec: AccessSpec): boolean;
  /** True when a read grant (bare / r. / w.) covers the code. */
  canRead(spec: AccessSpec): boolean;
  /** True when a write grant (bare or w.) covers the code. */
  canWrite(spec: AccessSpec): boolean;
  setPermissions(permissions: string[]): AccessContext;
  subscribe(listener: () => void): () => void;
}

/** Creates a per-request access context. */
export function createAccess(options?: AccessOptions): AccessContext;

/** Normalizes an access spec into { code, level }. */
export function parseAccessSpec(
  spec: AccessSpec | { code: string; level?: AccessLevel }
): { code: string; level: AccessLevel } | null;

/** Returns the resource code of a spec, without the read/write prefix. */
export function stripAccessCode(spec: AccessSpec): string;

/** Runs build() with the access context active, then restores the outer one. */
export function withAccess<T>(access: AccessContext | null, build: () => T): T;

/** Returns the access context active in the current render scope. */
export function currentAccess(): AccessContext | null;

/** Installs a global access context (single-user SPA); overridden by SSR options.access or withAccess scope. */
export function installAccess(access: AccessContext | null): AccessContext | null;

// ---
// Generic scoped context
// ---

/** Per-render provider map injected by withContext / SSR options.context. */
export type ContextProviders = Record<string, unknown>;

/** Runs build() with the providers active, then restores the outer scope. */
export function withContext<T>(providers: ContextProviders | null | undefined, build: () => T): T;

/** Installs a global fallback context (single-user SPA). */
export function installContext(
  providers: ContextProviders | null | undefined
): ContextProviders | null;

/** Removes the globally installed fallback context. */
export function clearInstalledContext(): null;

/** Returns the nearest value for a key; falls back to installed context and defaultValue. */
export function currentContext<T = unknown>(key: string, defaultValue?: T): T | undefined;

/** Returns a shallow merged snapshot of the active context. */
export function snapshotContext(): ContextProviders;

/**
 * Declares a value for the subtree being built right now (the current setup
 * callback or component render). Throws when called outside a build frame.
 */
export function provide(key: string | symbol, value: unknown): unknown;

/**
 * Reads the nearest provided value: lexical build frames, then the parent
 * chain, then withContext layers / installContext, then fallback.
 */
export function inject<T = unknown>(key: string | symbol, fallback?: T): T | undefined;

/**
 * Builds a subtree that is attached under host later (async loaders, route
 * views): the subtree can inject from host's position in the tree, while its
 * own declarations scope to the produced subtree.
 */
export function buildInProviderScope<T>(host: unknown, build: () => T): T;

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
// View tree nodes
// ---------------------------------------------------------------------------

/**
 * ViewNode is the base view-tree node: children, event cleanup, state and
 * lifecycle management shared by every node kind.
 */
export class ViewNode {
  constructor(setup?: SetupInput<ViewNode> | null);

  /** Unified initialization: callback, text, node instance, signal handle or object config. */
  setup(setup: SetupInput<ViewNode> | null): this;

  /** Returns a snapshot of child nodes. */
  children(): ViewNode[];

  /** Removes and schedules all children for destruction. */
  clearChildren(): this;

  /** Appends a keyed child; on elements the key is mirrored to data-row-key. */
  addChild(key: string | number, child: ChildInput): this;

  /** Returns the keyed child for a key, or null when it is not registered. */
  getChild(key: string | number): ViewNode | null;

  /** Removes and destroys the keyed child for a key. */
  removeChild(key: string | number): this;

  /** Adds children; strings/numbers are wrapped into text nodes. */
  child(...children: ChildInput[]): this;

  /**
   * Marks this node as a region whose content can be rebuilt from its own setup.
   * Declare it inside that setup builder: non-region build closures are released when the build
   * returns, so a node whose builder has already returned can no longer be promoted to a region.
   */
  rebuildable(predicate?: (() => boolean) | null): this;

  /** Whether a rebuild was skipped by the region predicate and is still pending. */
  rebuildPending(): boolean;

  /**
   * Whether a signal-triggered rebuild is queued and will run automatically:
   * coalesced inside the current batch, or re-queued while a rebuild is running.
   */
  rebuildScheduled(): boolean;

  /** Flushes bound values in this subtree without rebuilding structure. */
  flush(): this;

  /** Value-level update entry for non-signal sources: regions rebuild (predicate-gated), plain nodes only flush. */
  flushAll(): this;

  /** Re-runs the region builders: build first, then replace the previous children. */
  rebuild(options?: { force?: boolean }): this;

  /** Declares access control: bare default read, "w.xxx" write, "r.xxx" read. */
  access(spec: AccessSpec): this;

  /** Registers an event listener, bound immediately or at render time. */
  on(eventName: string, handler: EventHandler, options?: EventOptions): this;

  /** Removes the listener (and its DOM adapter) for an event name. */
  off(eventName: string): this;

  /** Inserts a keyed child before another keyed child; null beforeKey appends. */
  insertBefore(
    key: string | number,
    child: ViewNode | ComponentLike | string | number,
    beforeKey?: string | number | null
  ): this;

  /** Inserts a keyed child after another keyed child; null afterKey prepends. */
  insertAfter(
    key: string | number,
    child: ViewNode | ComponentLike | string | number,
    afterKey?: string | number | null
  ): this;

  /** Moves an existing keyed child before another keyed child; null beforeKey moves to end. */
  moveBefore(key: string | number, beforeKey?: string | number | null): this;

  /** Moves an existing keyed child after another keyed child; null afterKey moves to start. */
  moveAfter(key: string | number, afterKey?: string | number | null): this;

  /** Replaces the keyed child at the same slot with a fresh node; siblings stay untouched. */
  replaceChild(key: string | number, child: ViewNode | ComponentLike | string | number): this;

  /**
   * Signal-driven keyed item binding. Rows whose key and reference are unchanged
   * keep their nodes; changed rows are rebuilt in place; ordering uses insertBefore.
   * Pass `options` to reuse or update rows whose reference changed:
   * `equals` marks content-equivalent rows as unchanged, `update` rewrites the
   * existing node in place (`equals` wins when both are given).
   */
  keyed<TRow>(
    source: SignalHandle<TRow[]>,
    build: (row: TRow, index: number) => ViewNode | ComponentLike | string | number,
    options?: KeyedRowUpdate<TRow>
  ): this;
  keyed<TRow>(
    source: SignalHandle<TRow[]>,
    keyFn: (row: TRow, index: number) => string | number,
    build: (row: TRow, index: number) => ViewNode | ComponentLike | string | number,
    options?: KeyedRowUpdate<TRow>
  ): this;

  /**
   * Declares or replaces conditional attachment. The condition may be a signal
   * handle, a boolean or a zero-argument closure; it defaults to `true` (always
   * attached). The parent adopts it at tree entry, and calling this again on an
   * attached node replaces the condition immediately. Closure conditions refresh
   * through the parent's flush().
   */
  mountable(condition?: SignalHandle | boolean | ValueReader<unknown>): this;

  /** Latest committed state of this node's own mount condition (default true). */
  isMounted(): boolean;

  /**
   * Subtree error boundary. The handler receives the original error and an info
   * object ({ phase: 'build' | 'render' | 'event' | 'update', message, source,
   * boundary }). Returning a node replaces this subtree with a fallback; returning
   * nothing only reports and keeps the current state. The nearest boundary owns the
   * capture and never forwards it further; a throwing handler propagates outward.
   * Captures are never silent: console.error always fires and a devtools 'error'
   * event is emitted when enabled.
   */
  whenFailed(
    handler: (
      error: unknown,
      info: {
        phase: 'build' | 'render' | 'event' | 'update';
        message: string;
        source: unknown;
        boundary: unknown;
      }
    ) => ViewNode | ComponentLike | string | number | null | undefined | void
  ): this;

  /**
   * Binds a window-level listener owned by this node; unbound automatically
   * on destroy() and reset across region rebuilds when called in a builder.
   */
  bindWindowEvent(
    type: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions | boolean
  ): this;

  /** Document-level twin of bindWindowEvent(); owned by this node. */
  bindDocumentEvent(
    type: string,
    handler: (event: Event) => void,
    options?: AddEventListenerOptions | boolean
  ): this;

  /**
   * Runs callback once on the next animation frame; canceled automatically when
   * the node is destroyed before it fires. No-op outside the browser.
   */
  bindAnimationFrame(callback: (time: number) => void): this;

  /**
   * Runs callback on every animation frame until destroy() or
   * stopAnimationFrameLoop(); one loop per node (re-binding restarts it).
   */
  bindAnimationFrameLoop(callback: (time: number) => void): this;

  /** Stops the loop started by bindAnimationFrameLoop(). */
  stopAnimationFrameLoop(): this;

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

/** Outward command methods collected on the api object of vNode's setup callback. */
export type VNodeCommand = (...args: any[]) => any;
export type VNodeApi = Record<string, VNodeCommand>;

/**
 * ComponentNode shortcut factory: build the view inside `setup(api)` and get the node
 * back. Command methods collected on `api` are attached to the node itself; a name that
 * collides with the node API (child / attr / whenFailed ...) throws instead of silently
 * overwriting it. Returning `api` from a command is the same as returning the node.
 */
export function vNode<TApi extends VNodeApi = VNodeApi>(
  setup: (api: TApi) => ViewNode | ViewNode[]
): ComponentNode & TApi;

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

  /** Toggles a class from a truthy value; a signal handle or closure makes it live. */
  toggleClass(name: string, value: boolean | SignalHandle<unknown> | ValueReader<unknown>): this;

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
export function vText(content?: TextContent): VTextNode;
/** Alias of vText(). */
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
// Signals
// ---------------------------------------------------------------------------

/**
 * Core signal handle: the only signal object business code sees.
 * Engine-native signal objects never leak into the DSL.
 */
export interface SignalHandle<T = unknown> {
  value: T;
  peek(): T;
  subscribe(listener: (value: T) => void): () => void;
  update(updater: (value: T) => T): SignalHandle<T>;
}

/** Creates a writable signal. */
export function ref<T>(initial: T): SignalHandle<T>;

/** Creates a read-only derived signal; lazy, cached, recomputed on dependency change. */
export function computed<T>(compute: () => T): Readonly<SignalHandle<T>>;

/** True for yoya signal handles (plain `{ value }` objects are not signals). */
export function isSignal(value: unknown): value is SignalHandle<unknown>;

/**
 * A keyed boolean state set: which key is selected / active / hovered / matched.
 *
 * `has(key)` returns a read-only value-position handle, so it can drive class,
 * attribute, style, text and component props bindings directly. Writing goes
 * through the collection methods, which only touch the affected key buckets —
 * a `set()` wakes the previous and the next key instead of every row.
 */
export interface KeyedSet<K = unknown> {
  /** Read-only value-position handle: `line.toggleClass('danger', active.has(row.id))`. */
  has(key: K): Readonly<SignalHandle<boolean>>;
  /** Plain boolean read (no subscription): for SSR output and imperative branches. */
  isActive(key: K): boolean;
  /** Snapshot of the currently active keys. */
  keys(): K[];
  readonly size: number;
  /** Single-select: replace the active set with this key. */
  set(key: K): KeyedSet<K>;
  add(key: K): KeyedSet<K>;
  remove(key: K): KeyedSet<K>;
  toggle(key: K): KeyedSet<K>;
  /** Bulk update; only the difference is written (select-all stays linear). */
  replace(keys: Iterable<K>): KeyedSet<K>;
  clear(): KeyedSet<K>;
  /** Release one key's bucket (call when the key leaves the data set). */
  drop(key: K): KeyedSet<K>;
  /** Release every bucket (call when the data set is replaced). */
  dispose(): KeyedSet<K>;
}

/** Creates a keyed boolean state set. Live alongside the data set it describes. */
export function createKeyedSet<K = unknown>(): KeyedSet<K>;

/** Runs `run` with coalesced notification when the engine supports batching. */
export function batch<T>(run: () => T): T;

/**
 * State engine adapter contract: value cells and change notification only.
 * Dependency collection, scheduling and lifetimes stay in core, so signals
 * libraries and store-shaped libraries (e.g. zustand) both qualify. Core owns
 * `computed()`; an engine may optionally provide `createComputed` to derive
 * natively, whose laziness keeps unobserved values from subscribing.
 */
export interface SignalsAdapter {
  name?: string;
  createSignal<T>(initial: T): unknown;
  createComputed?<T>(compute: () => T): unknown;
  read(source: unknown): any;
  write(source: unknown, value: unknown): void;
  subscribe(source: unknown, listener: (value: unknown) => void): () => void;
  batch<T>(run: () => T): T;
  untracked?<T>(run: () => T): T;
  effect?(run: () => void): () => void;
  isSource?(value: unknown): boolean;
}

/** Installs a signals engine adapter (replacement, one engine at a time); null restores the built-in engine. */
export function installSignals(adapter?: SignalsAdapter | null): SignalsAdapter;

/** Returns the active signals engine adapter. */
export function currentSignals(): SignalsAdapter;

/** Validates an adapter, throwing when required methods are missing. */
export function assertSignalsAdapter(adapter: unknown): SignalsAdapter;

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
export function injectDocumentStyle(
  styleText: string,
  dataAttribute?: string | null
): HTMLStyleElement | null;

/** Initializes theme mode/name from explicit values or persisted storage. */
export function initYoyaTheme(options?: InitYoyaThemeOptions): {
  mode: YoyaMode;
  theme: string;
};

declare global {
  interface String {
    /**
     * i18n string shortcut: "default text".s(key, paramsOrLocale?, maybeLocale?).
     * Param values accept signal handles; writes refresh the text in place.
     * The locale argument may be an I18n instance or a registered locale key.
     */
    s(
      key: string,
      paramsOrLocale?: Record<string, unknown> | I18n | string,
      maybeLocale?: I18n | string
    ): I18nTextNode;
  }
}
