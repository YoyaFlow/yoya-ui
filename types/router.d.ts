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

/** Hash/history router as a view node. */
export class Router extends ElementNode {
  default(path: string): Router;
  mode(): RouterMode;
  mode(value: RouterMode): Router;
  route(pattern: string, config: RouteConfig | RouteView): Router;
  /** Declarative route registration (available on vRouter instances). */
  vRoute(pattern: string, config: RouteConfig | RouteView): Router;
  notFound(view: RouteView): Router;
  loading(view: RouteView): Router;
  error(view: RouteView): Router;
  beforeEach(guard: RouterGuard): Router;
  start(): Router;
  stop(): Router;
  navigate(path: string, options?: NavigateOptions): Router;
  refresh(): Router;
  renderPath(path: string): Router;
  currentPath(): string;
  currentParams(): Record<string, string>;
  currentQuery(): Record<string, string>;
  currentRoute(): RouteDeclaration | null;
  currentView(): ViewNodeLike | null;
  outlet(): ElementNode;
  outlet(value: ElementNode): Router;
  subscribe(listener: (router: Router) => void): () => void;
  go(delta: number): Router;
  back(): Router;
  forward(): Router;
}

/** Minimal node shape returned by currentView(). */
export interface ViewNodeLike {
  toHTML(): string;
  renderDom(): Node | null;
  destroy(): unknown;
  [key: string]: any;
}

/** Creates a router; alias of createRouter. */
export const router: typeof createRouter;

/** Creates a router with optional setup. */
export const createRouter: ElementFactory<Router> & {
  (first?: SetupInput<Router> | null, callback?: SetupCallback<Router>): Router;
};

/** Declares a route (used inside route lists). */
export function vRoute(pattern: string, config: RouteConfig | RouteView): RouteDeclaration;

/** Declarative router container. */
export const vRouter: ElementFactory<Router> & {
  (first?: SetupInput<Router> | null, callback?: SetupCallback<Router>): Router;
};

/** Router link with to/params/query/replace/exact helpers. */
export function vLink(
  routerInstance: Router,
  setup?: SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/** Current-route outlet bound to a router. */
export function vRouterView(
  routerInstance: Router,
  setup?: SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/** Multi-outlet router view. */
export function vRouterViews(
  routerInstance: Router,
  setup?: SetupInput<HtmlElementNode> | null,
  callback?: SetupCallback<HtmlElementNode>
): HtmlElementNode;

/**
 * Parent-shortcut surface merged onto HtmlElementNode. Router shortcuts
 * (vRouter/vLink/vRouterView/vRouterViews) live on ElementNode and are
 * inherited; this interface is kept for the shared DSL merge point.
 */
export interface RouterParentShortcuts {}

export type { ElementOptions };
