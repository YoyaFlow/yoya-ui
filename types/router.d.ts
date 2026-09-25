import type {
  ChildInput,
  ElementFactory,
  ElementNode,
  ElementOptions,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';

export type RouterMode = 'hash' | 'history';

export interface RouteContext {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  route: RouteDeclaration | null;
}

export type RouteView = ChildInput | ((context: RouteContext) => ChildInput | Promise<ChildInput>);

export interface RouteConfig {
  view?: RouteView;
  component?: RouteView;
  beforeEnter?: (context: RouteContext) => boolean | void | Promise<boolean | void>;
  /**
   * Document route: the address this route navigates to as a real document
   * (an internal HTML page or an external link) instead of rendering a view.
   * `true` means the registered pattern is itself the address.
   */
  url?: string | true;
  /** Where the document opens (`_blank`, …); `_blank` implies `rel="noopener"`. */
  target?: string;
  /** Link relation used when the route is rendered as a link. */
  rel?: string;
  /** Use `location.replace` instead of `location.assign` for this route. */
  replace?: boolean;
  [key: string]: any;
}

export interface RouteDeclaration {
  pattern: string;
  config: RouteConfig | RouteView;
}

export type RouterGuard = (context: RouteContext) => boolean | void | Promise<boolean | void>;

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

/** Hash/history VRouter as a view node. */
export class VRouter extends ElementNode {
  default(): string | null;
  default(path: string): VRouter;
  mode(): RouterMode;
  mode(value: RouterMode): VRouter;
  route(pattern: string, config: RouteConfig | RouteView): VRouter;
  /** Declarative route registration (available on vRouter instances). */
  vRoute(pattern: string, config: RouteConfig | RouteView): VRouter;
  notFound(view: RouteView): VRouter;
  loading(view: RouteView): VRouter;
  error(view: RouteView): VRouter;
  beforeEach(guard: RouterGuard): VRouter;
  start(): VRouter;
  stop(): VRouter;
  navigate(path: string, options?: NavigateOptions): VRouter;
  /**
   * Full-page navigation outlet for document routes (internal HTML addresses and
   * external links). Override it to plug in a custom navigation; it is a no-op
   * where `window` is unavailable (server rendering).
   */
  navigateDocument(url: string, options?: NavigateOptions): VRouter;
  refresh(): VRouter;
  renderPath(path: string): VRouter;
  currentPath(): string;
  currentParams(): Record<string, string>;
  currentQuery(): Record<string, string>;
  currentRoute(): RouteDeclaration | null;
  currentView(): ViewNodeLike | null;
  outlet(): ElementNode;
  outlet(value: ElementNode): VRouter;
  subscribe(listener: (router: VRouter) => void): () => void;
  go(delta: number): VRouter;
  back(): VRouter;
  forward(): VRouter;
}

/** Minimal node shape returned by currentView(). */
export interface ViewNodeLike {
  toHTML(): string;
  renderDom(): Node | null;
  destroy(): unknown;
  [key: string]: unknown;
}

/** Creates a router; alias of createRouter. */
export const router: typeof createRouter;

/** Legacy name of the router component definition. */
export const Router: typeof VRouter;

/** Creates a VRouter with optional setup. */
export const createRouter: ElementFactory<VRouter> & {
  (first?: SetupInput<VRouter> | null, callback?: SetupCallback<VRouter>): VRouter;
};

/** Declares a route (used inside route lists). */
export function vRoute(pattern: string, config: RouteConfig | RouteView): RouteDeclaration;

/** Declarative VRouter container. */
export const vRouter: ElementFactory<VRouter> & {
  (first?: SetupInput<VRouter> | null, callback?: SetupCallback<VRouter>): VRouter;
};

/** `vLink(router, { … })` 的可派发键（节点级 setup 仍照旧透传）。 */
export interface LinkOptions {
  exact?: boolean;
  label?: ChildInput;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  replace?: boolean;
  to?: string;
  [key: string]: unknown;
}

/** VRouter link with to/params/query/replace/exact helpers. */
export function vLink(
  routerInstance: VRouter,
  setup?: LinkOptions | SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/** Current-route outlet bound to a router. */
export function vRouterView(
  routerInstance: VRouter,
  setup?: SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/** Multi-outlet router view. */
export function vRouterViews(
  routerInstance: VRouter,
  setup?: SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/**
 * Parent-shortcut surface merged onto HtmlElementNode. VRouter shortcuts
 * (vRouter/vLink/VRouterView/VRouterViews) live on ElementNode and are
 * inherited; this interface is kept for the shared DSL merge point.
 */
export interface RouterParentShortcuts {}

export type { ElementOptions };
