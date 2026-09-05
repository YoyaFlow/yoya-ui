import { snapshotContext } from './context.js';

/** Dev-facing tree instrumentation. Opt-in, zero-cost when disabled. */
let enabled = false;
const listeners = new Set();

// Node identity: ids stay stable for the life of a node and map back to the
// live node so debug UIs can locate the rendered DOM element. The registry is
// pruned on destroy; ids themselves live in a WeakMap so GC is unaffected.
const nodeIds = new WeakMap();
const liveNodes = new Map();
let nextNodeId = 1;
let nextEventSeq = 1;
const appliedSignatures = new WeakMap();

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
  const enriched = {
    seq: nextEventSeq,
    ...event
  };
  nextEventSeq += 1;
  if (enriched.node && typeof enriched.node === 'object' && enriched.nodeId === undefined) {
    enriched.nodeId = ensureDevtoolsNode(enriched.node);
  }
  if (enriched.node && typeof enriched.node === 'object' && enriched.nodeLabel === undefined) {
    enriched.nodeLabel = devtoolsNodeLabel(enriched.node);
  }
  listeners.forEach((listener) => {
    try {
      listener(enriched);
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

/** Internal: capture the context scope visible while a node is built. */
export function captureDevtoolsNodeScope(node) {
  const context = snapshotContext();
  const keys = Object.keys(context);
  node._devtoolsContext = keys.length > 0 ? context : null;
}

/** Returns scope details (access/context/i18n) for a snapshot id. */
export function getDevtoolsScope(id) {
  const node = liveNodes.get(id);
  if (!node || node._deleted) {
    return null;
  }

  const declared = node._access;
  const scope = {
    id,
    access: declared ? { code: declared.code, level: declared.level } : null,
    context: node._devtoolsContext || null,
    i18n: null
  };
  if (typeof node._permissionState === 'function') {
    scope.permissionState = node._permissionState();
  }
  if (node._i18n && typeof node._i18n.getLanguage === 'function') {
    scope.i18n = {
      key: node._key ?? undefined,
      language: node._i18n.getLanguage()
    };
  }
  return scope;
}

/** Returns the rendered DOM node (element or text) for a snapshot id. */
export function getDevtoolsDom(id) {
  const node = liveNodes.get(id);
  if (!node || node._deleted || !('_el' in node) || !node._el) {
    return null;
  }
  return node._el;
}

/** Internal: register/return the stable id for a live node. */
export function ensureDevtoolsNodeId(node) {
  return ensureDevtoolsNode(node);
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

function devtoolsNodeLabel(node) {
  const kind = devtoolsNodeKind(node);
  if (kind === 'element') {
    const classes = node._classes ? [...node._classes].slice(0, 2) : [];
    const classText = classes
      .map((name) => String(name).replace(/\s+/g, ''))
      .filter(Boolean)
      .map((name) => `.${name}`)
      .join('');
    return `${node._tagName || 'element'}${classText}`;
  }
  if (kind === 'text') {
    const content = typeof node._content === 'string' ? node._content : '';
    const short = content.length > 24 ? `${content.slice(0, 24)}…` : content;
    return `文本 "${short}"`;
  }
  if (kind === 'component') {
    return '组件';
  }
  return '节点';
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

function devtoolsSignature(node) {
  const kind = devtoolsNodeKind(node);
  const baseId = ensureDevtoolsNode(node);
  if (kind === 'element') {
    return {
      kind,
      id: baseId,
      attrs: { ...node._attrs },
      styles: { ...node._styles },
      childIds: (node._children || []).map((child) => ensureDevtoolsNode(child))
    };
  }
  if (kind === 'text') {
    return {
      kind,
      id: baseId,
      text: node._content
    };
  }
  if (kind === 'component') {
    return {
      kind,
      id: baseId,
      childIds: (node._resolvedList || []).map((child) => ensureDevtoolsNode(child))
    };
  }
  return {
    kind,
    id: baseId,
    childIds: (node._children || []).map((child) => ensureDevtoolsNode(child))
  };
}

function diffObjectValues(previous, next) {
  const changes = {};
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  keys.forEach((key) => {
    if (!Object.is(previous[key], next[key])) {
      changes[key] = { previous: previous[key], next: next[key] };
    }
  });
  return Object.keys(changes).length > 0 ? changes : null;
}

function diffSignatures(previous, next) {
  const changes = {};

  if (previous.kind === 'element' && next.kind === 'element') {
    const attrs = diffObjectValues(previous.attrs, next.attrs);
    if (attrs) {
      changes.attrs = attrs;
    }
    const styles = diffObjectValues(previous.styles, next.styles);
    if (styles) {
      changes.styles = styles;
    }
  }

  if (previous.kind === 'text' && next.kind === 'text' && !Object.is(previous.text, next.text)) {
    changes.text = { from: previous.text, to: next.text };
  }

  const previousChildIds = previous.childIds || [];
  const nextChildIds = next.childIds || [];
  const previousSet = new Set(previousChildIds);
  const nextSet = new Set(nextChildIds);
  const added = nextChildIds.filter((id) => !previousSet.has(id));
  const removed = previousChildIds.filter((id) => !nextSet.has(id));
  const sameIds = removed.length === 0 && added.length === 0;
  const reordered =
    sameIds &&
    nextChildIds.length > 1 &&
    nextChildIds.some((id, index) => previousChildIds[index] !== id);
  if (added.length > 0 || removed.length > 0 || reordered) {
    changes.children = { added, removed, reordered };
  }

  return changes;
}

/**
 * Internal: sync the applied-signature baseline after a live mutation so a
 * later unchanged renderDom does not replay the same change.
 */
export function refreshDevtoolsSignature(node) {
  if (node) {
    appliedSignatures.set(node, devtoolsSignature(node));
  }
}

/** Internal: notify a live mutation that already changed the DOM/view tree. */
export function notifyDevtoolsMutation(node, type, details) {
  if (!enabled || !node) {
    return;
  }
  emitDevtools({ type, node, ...details });
  refreshDevtoolsSignature(node);
}

/**
 * Internal: called at the end of renderDom. First render emits a mount
 * commit; later renders emit granular events only when the signature moved.
 */
export function commitDevtoolsNode(node) {
  if (!enabled || !node || node._deleted) {
    return;
  }

  const next = devtoolsSignature(node);
  const previous = appliedSignatures.get(node);
  if (!previous) {
    emitDevtools({ type: 'commit', kind: 'mount', node });
    appliedSignatures.set(node, next);
    return;
  }

  const changes = diffSignatures(previous, next);
  Object.entries(changes.attrs || {}).forEach(([name, change]) => {
    emitDevtools({ type: 'attr', node, name, ...change });
  });
  Object.entries(changes.styles || {}).forEach(([name, change]) => {
    emitDevtools({ type: 'style', node, name, ...change });
  });
  if (changes.children) {
    emitDevtools({ type: 'child', node, ...changes.children });
  }
  if (changes.text) {
    emitDevtools({ type: 'text', node, ...changes.text });
  }
  appliedSignatures.set(node, next);
}

/** Returns a plain-shape snapshot of a node subtree for inspection. */
export function getDevtoolsSnapshot(root) {
  if (!root) {
    return { kind: 'root', children: [] };
  }
  return serializeDevtoolsNode(root);
}

// 挂到共享 bridge：主入口与 devtools 子路径无论各自打包成几份模块，都会
// 读到同一个开关/事件流/注册表。仅导入 devtools 入口时执行一次。
const devtoolsBridgeKey = Symbol.for('yoya.devtools.bridge');

function installDevtoolsBridge() {
  if (typeof globalThis === 'undefined') {
    return;
  }
  globalThis[devtoolsBridgeKey] = {
    captureScope: captureDevtoolsNodeScope,
    commit: commitDevtoolsNode,
    emit: emitDevtools,
    enabled: () => enabled,
    ensureId: ensureDevtoolsNodeId,
    notify: notifyDevtoolsMutation,
    unregister: unregisterDevtoolsNode
  };
}

installDevtoolsBridge();
