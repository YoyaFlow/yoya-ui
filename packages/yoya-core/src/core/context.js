/**
 * Scoped data sharing, two layers with one read side:
 *
 *   - withContext(providers, build) / installContext: call-stack scope, active
 *     only while build() runs. Suits request-level injection and SSR isolation.
 *   - provide(key, value): node-tree scope, declared from the frame currently
 *     being built (a setup callback or a component render) and read by
 *     descendants with inject(key, fallback). Survives deferred rendering.
 *
 * inject() looks up the provide chain first (lexical frames, then the parent
 * chain), then falls back to withContext layers and the installed context.
 */

const contextStack = [];
let installedContext = null;
const providerStack = [];
// Distinguishes "not provided" from "provided as undefined".
const MISSING = Symbol('yoya.context.missing');

/**
 * Runs build() with the given providers active, then restores the outer scope.
 * Providers can be a plain object (key → value) resolved per call site.
 */
export function withContext(providers, build) {
  if (!providers || typeof providers !== 'object') {
    return build();
  }

  contextStack.push(providers);
  try {
    return build();
  } finally {
    contextStack.pop();
  }
}

/**
 * Installs a global fallback context (single-user SPA). SSR entries inject a
 * per-request context through options.context instead, so requests never share.
 */
export function installContext(providers) {
  installedContext = providers && typeof providers === 'object' ? providers : null;
  return installedContext;
}

/** Removes the globally installed fallback context. */
export function clearInstalledContext() {
  installedContext = null;
  return null;
}

/**
 * Returns the nearest provided value for key, walking scopes from innermost
 * to outermost, then the installed fallback; returns defaultValue when absent.
 */
export function currentContext(key, defaultValue = undefined) {
  for (let index = contextStack.length - 1; index >= 0; index -= 1) {
    const layer = contextStack[index];
    if (layer && Object.prototype.hasOwnProperty.call(layer, key)) {
      return layer[key];
    }
  }

  if (installedContext && Object.prototype.hasOwnProperty.call(installedContext, key)) {
    return installedContext[key];
  }

  return defaultValue;
}

/** Returns a shallow merged snapshot (installed fallback overlaid by active scopes). */
export function snapshotContext() {
  const merged = { ...(installedContext || {}) };
  contextStack.forEach((layer) => Object.assign(merged, layer));
  return merged;
}

/**
 * Runs run() with owner as the active provide target and inject frame.
 * Called by the node engine around setup callbacks, region rebuilds and
 * component renders; not part of the public surface.
 */
export function withProviderScope(owner, run, options = {}) {
  if (!owner) {
    return run();
  }

  // 区域重跑会重新执行 builder：上一轮的声明作废，避免残留过期键。
  if (options.reset) {
    owner._provides = null;
  }

  providerStack.push(owner);
  try {
    return run();
  } finally {
    providerStack.pop();
  }
}

/**
 * Build frame for content that is built before it is attached: declarations are
 * collected on the frame and moved onto the produced node with adoptProvides().
 */
export function createProviderFrame() {
  return { _provides: null };
}

/**
 * Moves the declarations collected on a build frame onto the node it produced.
 * Frame values are the outer layer: the node's own declarations win.
 */
export function adoptProvides(frame, node) {
  if (!frame?._provides || !node) {
    return node;
  }

  const merged = new Map(frame._provides);
  if (node._provides) {
    node._provides.forEach((value, key) => merged.set(key, value));
  }
  node._provides = merged;

  return node;
}

/**
 * Builds a subtree that will be attached under host later: the subtree can
 * inject from host's position in the tree, while the values it declares itself
 * belong to the produced subtree instead of leaking to host's other children.
 */
export function buildInProviderScope(host, build) {
  const frame = createProviderFrame();
  const built = withProviderScope(host, () => withProviderScope(frame, build));
  return adoptProvides(frame, built);
}

/**
 * Declares a value for the subtree being built right now. Must be called while
 * a node is being built (setup callback or component render), so the value can
 * attach to that node and be released together with it.
 */
export function provide(key, value) {
  const owner = currentProviderOwner();
  if (!owner) {
    throw new TypeError(
      'provide() must be called while building a node: call it inside a setup ' +
        'callback or a component render(). Use installContext() for a global layer.'
    );
  }

  if (!owner._provides) {
    owner._provides = new Map();
  }

  owner._provides.set(key, value);

  return value;
}

/**
 * Reads the nearest provided value: lexical build frames first (innermost
 * wins), then the parent chain of the node being built, then withContext
 * layers, the installed context and finally fallback. Keys may be strings or
 * symbols; a value provided as undefined counts as present.
 */
export function inject(key, fallback = undefined) {
  for (let index = providerStack.length - 1; index >= 0; index -= 1) {
    const store = providerStack[index]?._provides;
    if (store && store.has(key)) {
      return store.get(key);
    }
  }

  // 父链：构建中的中间节点还没挂到父节点上（就地构建时 _parent 为空），
  // 所以要逐帧向上找——内层帧的父链断了，就交给外层帧的父链继续。
  for (let index = providerStack.length - 1; index >= 0; index -= 1) {
    for (let node = providerStack[index]?._parent; node; node = node._parent) {
      const store = node._provides;
      if (store && store.has(key)) {
        return store.get(key);
      }
    }
  }

  const scoped = currentContext(key, MISSING);
  return scoped === MISSING ? fallback : scoped;
}

/** 当前正在构建的节点：provide 的写入目标、inject 的词法起点。 */
function currentProviderOwner() {
  return providerStack.length > 0 ? providerStack[providerStack.length - 1] : null;
}
