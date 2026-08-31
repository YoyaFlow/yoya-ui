import type { ChildInput, ElementNode, ElementOptions, SetupCallback, SetupInput } from './core.js';

export type DynamicLoaderStatus = 'pending' | 'loading' | 'loaded' | 'error';

export interface DynamicLoaderViews {
  pending?: ChildInput | ((payload: unknown, node: DynamicLoaderNode) => ChildInput);
  loading?: ChildInput | ((payload: unknown, node: DynamicLoaderNode) => ChildInput);
  loaded?: ChildInput | ((payload: unknown, node: DynamicLoaderNode) => ChildInput);
  error?: ChildInput | ((payload: unknown, node: DynamicLoaderNode) => ChildInput);
}

export interface DynamicLoaderOptions {
  loader: () => unknown | Promise<unknown>;
  auto?: boolean;
  cacheKey?: string | null;
  onStateChange?: (status: DynamicLoaderStatus, payload: unknown, node: DynamicLoaderNode) => void;
  views?: DynamicLoaderViews;
}

/** Lazy module loader node with status views. */
export interface DynamicLoaderNode extends ElementNode {
  status(): DynamicLoaderStatus;
  state(): DynamicLoaderStatus;
  module(): unknown;
  value(): unknown;
  loadError(): unknown;
  error(): unknown;
  load(): Promise<unknown>;
  retry(): Promise<unknown>;
  preload(): Promise<unknown>;
  clearCache(): DynamicLoaderNode;
}

/** Creates a lazy-loading node; loader may be a function or a cache-keyed option object. */
export function vDynamicLoader(
  first?:
    | DynamicLoaderOptions
    | (() => unknown | Promise<unknown>)
    | SetupCallback<DynamicLoaderNode>
    | null,
  options?: ElementOptions,
  callback?: SetupCallback<DynamicLoaderNode>
): DynamicLoaderNode;

/** Preloads a module into the shared cache. */
export function preloadDynamicModule(
  cacheKey: string,
  loader: () => unknown | Promise<unknown>
): Promise<unknown>;

/** Clears the shared module cache (all entries when cacheKey is omitted). */
export function clearDynamicModuleCache(cacheKey?: string | null): void;

/**
 * Parent-shortcut surface merged onto HtmlElementNode. vDynamicLoader is
 * registered on ElementNode and inherited, so it is declared there.
 */
export interface AsyncParentShortcuts {}
