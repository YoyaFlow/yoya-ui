/** Dev-facing tree instrumentation. Opt-in, zero-cost when disabled. */
let enabled = false;
const listeners = new Set();

export function enableDevtools() {
  enabled = true;
  return true;
}

export function disableDevtools() {
  enabled = false;
  return false;
}

export function isDevtoolsEnabled() {
  return enabled;
}

/** Subscribe to lifecycle events emitted while devtools is enabled. */
export function subscribeDevtools(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Internal: broadcast a lifecycle event; no-op when disabled. */
export function emitDevtools(event) {
  if (!enabled) {
    return;
  }
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Devtool listeners must never break rendering.
    }
  });
}

/** Returns a plain-shape snapshot of a node subtree for inspection. */
export function getDevtoolsSnapshot(root) {
  const tagName = root && typeof root.tagName === 'function' ? root.tagName() : 'root';
  const children =
    root && typeof root.children === 'function' && Array.isArray(root.children())
      ? root.children()
      : [];
  return {
    type: 'node',
    tagName,
    children: children.map((child) => getDevtoolsSnapshot(child))
  };
}
