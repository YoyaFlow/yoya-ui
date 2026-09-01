import type { ComponentLike, I18n, ViewNode } from './core.js';
import type { HtmlElementNode } from './html.js';

export type PageFactory<S = unknown> = (state: S) => ViewNode | ComponentLike | PageFactory<S>;

/**
 * Optional i18n binding for render/mount/hydrate: an I18n instance, or a
 * factory receiving the request state. When provided, the ".s()" string
 * shortcut is automatically scoped to that instance during the build.
 */
export interface SsrI18nOption<S = unknown> {
  i18n?: I18n | ((state: S | null) => I18n);
}

export interface RenderOptions<S = unknown> extends SsrI18nOption<S> {
  maxNodes?: number;
  state?: S | null;
}

export interface RenderResult {
  exceeded: boolean;
  html: string;
  state: string | null;
}

/** Raw request fields accepted by resolveLocale; extraction is done by the caller. */
export interface LocaleInput {
  /** Raw Cookie request header string. */
  cookie?: string;
  /** Request URL (path + query, or full URL). */
  url?: string;
  /** Raw Accept-Language request header string. */
  acceptLanguage?: string;
}

export interface ResolveLocaleOptions {
  /** Cookie key holding the locale identifier. Defaults to "yoya-lang". */
  cookieKey?: string;
  /** Query key used as fallback. Defaults to "locale". */
  queryKey?: string;
  /** Locale returned when nothing matches. Defaults to "zh-CN". */
  defaultLanguage?: string;
}

/**
 * Resolves the locale identifier from a request with priority
 * cookie > query > Accept-Language > defaultLanguage. Only receives raw
 * strings, so it works with any framework; extract the fields yourself
 * (e.g. req.headers.cookie or request.headers.get('cookie')).
 */
export function resolveLocale(input?: LocaleInput | null, options?: ResolveLocaleOptions): string;

/**
 * Server-side render: serializes a page factory/component to HTML plus initial
 * state. Exceeds maxNodes, falls back to client rendering.
 */
export function renderToString<S = unknown>(
  component: ViewNode | ComponentLike | PageFactory<S>,
  options?: RenderOptions<S>
): RenderResult;

/** Serializes state to a JSON string safe to inline into <script>. */
export function serializeState(state: unknown): string | null;

/** Parses serialized state; null/empty input returns null. */
export function parseState(serialized: string | null | undefined): unknown;

/** Client-side full mount: rebuilds the tree and replaces the target content. */
export function mount<S = unknown>(
  component: ViewNode | ComponentLike | PageFactory<S>,
  target: string | ParentNode,
  state?: S | null,
  options?: SsrI18nOption<S>
): ViewNode;

/** Hydrates server-rendered DOM: adopts elements and binds pending events. */
export function hydrate<S = unknown>(
  component: ViewNode | ComponentLike | PageFactory<S>,
  target: string | ParentNode,
  state?: S | null,
  options?: SsrI18nOption<S>
): ViewNode;

/** Document builder node used by renderPage: head/body callbacks build the page. */
export class PageDocumentNode extends HtmlElementNode {
  head(callback: (node: HtmlElementNode, state: unknown) => void): PageDocumentNode;
  body(callback: (node: HtmlElementNode, state: unknown) => void): PageDocumentNode;
  vBody(...args: unknown[]): PageDocumentNode;
}

export interface RenderPageConfig<S = unknown> {
  page: (page: PageDocumentNode, state: S | null) => void;
}

export interface RenderPageOptions<S = unknown> extends SsrI18nOption<S> {
  /** Per-request dictionary; builds an I18n instance from state.lang. */
  messages?: Record<string, any>;
  maxNodes?: number;
  /** State container id. Defaults to "__YOYA_DATA__". */
  stateId?: string;
  /** Hydration container id. Defaults to "app". */
  containerId?: string;
  /** Client entry script src. Defaults to "/client.js". */
  client?: string;
}

/** Renders a complete HTML document from DSL-defined head/body. */
export function renderPage<S = unknown>(
  config: RenderPageConfig<S>,
  state?: S | null,
  options?: RenderPageOptions<S>
): string;

export interface HydrateOrMountOptions<S = unknown> extends SsrI18nOption<S> {
  messages?: Record<string, any>;
  stateId?: string;
  target?: string | ParentNode;
}

/** Client bootstrap: reads state and hydrates or mounts in one call. */
export function hydrateOrMount<S = unknown>(
  component: ViewNode | ComponentLike | PageFactory<S>,
  options?: HydrateOrMountOptions<S>
): ViewNode | null;
