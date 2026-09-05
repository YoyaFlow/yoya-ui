/** Dev-facing tree instrumentation. Opt-in, zero-cost when disabled. */
let enabled = false;
const listeners = new Set();

// Node identity: ids stay stable for the life of a node and map back to the
// live node so debug UIs can locate the rendered DOM element. The registry is
// pruned on destroy; ids themselves live in a WeakMap so GC is unaffected.
const nodeIds = new WeakMap();
const liveNodes = new Map();
let nextNodeId = 1;

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

/** Subscribe to lifecycle events emitted while devtools is enabled. */
export function subscribeDevtools(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Assigns a stable id and keeps the node resolvable to its live DOM. */
function ensureDevtoolsNode(node) {
  let id = nodeIds.get(node);
  if (id === undefined) {
    id = nextNodeId;
    nextNodeId += 1;
    nodeIds.set(node, id);
  }
  liveNodes.set(id, node);
  return id;
}

/** Internal: forget a destroyed node so its id no longer resolves. */
export function unregisterDevtoolsNode(node) {
  const id = nodeIds.get(node);
  if (id !== undefined) {
    liveNodes.delete(id);
  }
}

/** Returns the rendered DOM node (element or text) for a snapshot id. */
export function getDevtoolsDom(id) {
  const node = liveNodes.get(id);
  if (!node || node._deleted || !('_el' in node) || !node._el) {
    return null;
  }
  return node._el;
}

function devtoolsNodeKind(node) {
  if (typeof node._tagName === 'string' && node._attrs) {
    return 'element';
  }
  if (typeof node._content === 'string' && '_textNode' in node) {
    return 'text';
  }
  if ('_component' in node && '_resolvedList' in node) {
    return 'component';
  }
  return 'view';
}

function devtoolsNodeChildren(node, kind) {
  if (kind === 'component') {
    return Array.isArray(node._resolvedList) ? node._resolvedList : [];
  }
  return Array.isArray(node._children) ? node._children : [];
}

function serializeDevtoolsNode(node) {
  const kind = devtoolsNodeKind(node);
  const base = {
    kind,
    id: ensureDevtoolsNode(node)
  };

  if (kind === 'element') {
    return {
      ...base,
      tagName: node._tagName,
      attrs: { ...node._attrs },
      children: devtoolsNodeChildren(node, kind).map((child) => serializeDevtoolsNode(child))
    };
  }

  if (kind === 'text') {
    return {
      ...base,
      text: node._content,
      children: []
    };
  }

  return {
    ...base,
    children: devtoolsNodeChildren(node, kind).map((child) => serializeDevtoolsNode(child))
  };
}

/** Returns a plain-shape snapshot of a node subtree for inspection. */
export function getDevtoolsSnapshot(root) {
  if (!root) {
    return { kind: 'root', children: [] };
  }
  return serializeDevtoolsNode(root);
}
