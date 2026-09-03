/**
 * Generic scoped context: inject per-render providers with withContext(),
 * read the nearest value with currentContext(). Mirrors the access/i18n
 * scope-stack pattern so Context also works per-request in SSR.
 */

const contextStack = [];
let installedContext = null;

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
