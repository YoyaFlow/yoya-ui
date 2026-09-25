/**
 * `yoya-ui/compiler-runtime`: runtime hooks for compiler-generated modules.
 *
 * Compiler output imports this subpath instead of the main entry, so a page that
 * never uses the compiler pays nothing for it. The hooks mirror the core's own
 * "adopt existing DOM" path (hydrate): the fragment comes from the framework's
 * serializer, the hooks only write values and reconcile lists.
 */

import type { ViewNode } from '@yoyaflow/yoya-core/internal/types/core.js';

/** Plan descriptor written into every generated module. */
export interface CompiledPlan {
  version: number;
  mode: 'element' | 'node';
  source: { file: string; fn: string };
  html: string;
  liveNodes: number;
  slots: number;
}

/** A row built by an element-mode generated factory. */
export interface CompiledRow {
  el: Element;
  data?: unknown;
  destroy(): void;
}

export interface CompiledList<Data = unknown> {
  readonly size: number;
  sync(data: Data[], build: (item: Data) => CompiledRow): void;
  data(): Data[];
  elements(): Element[];
  destroy(): void;
}

/** Clone one instance of a shape's fragment (`<template>` cached per shape). */
export declare function cloneFragment(html: string): Element;

/**
 * Node mode: attach an existing element to a wrapper node and activate its bindings.
 *
 * Text placeholders are claimed by the write that owns them (`bindChild`), so there is no
 * positional text-node list. `liveAttrs` names the attributes whose values are written at
 * runtime (an empty placeholder attribute is removed when the snapshot has no such value).
 */
export declare function adopt<T extends ViewNode>(
  node: T,
  element: Element,
  liveAttrs?: string[]
): T;

/** Node mode: bind a handle or write a plain value into an existing text node. */
export declare function bindChild(node: ViewNode, textNode: Text, value: unknown): void;

/**
 * Replace a fragment's text **anchor** (a comment, see the `TEXT_ANCHOR` note in the emitter) with a
 * real text node so a value can be written there. Text nodes and real elements are returned as-is;
 * anchors are what keeps two adjacent text positions from being merged by the HTML parser.
 */
export declare function textAt(anchor: Node): Node;

/**
 * Node mode: `child(<expression>)` — the value only becomes known at runtime.
 *
 * Dispatch is delegated to the core `child()` (string / number / handle / reader / node /
 * component / array / error), and the new children are registered in `places` as
 * `[child, before]` so the caller can restore their position after `adopt()` (the fragment's
 * following sibling is the boundary; `null` appends).
 */
export declare function mountRuntimeChildren(
  node: ViewNode,
  value: unknown,
  places: Array<[ViewNode, Node | null]>,
  before: Node | null
): Array<[ViewNode, Node | null]>;

/** Node mode: put a node (or a multi-root group) before `before` (`null` appends). */
export declare function mountNodeAt<T extends ViewNode>(
  node: T,
  container: Element,
  before: Node | null
): T;

export declare function appendNodeChild(parent: ViewNode, child: ViewNode): unknown;

/** Node mode: run a cleanup when the node is destroyed. */
export declare function bindNodeCleanup<T extends ViewNode>(node: T, cleanup: () => void): T;

/**
 * Element mode: write a text position. A handle (or zero-argument reader) stays
 * live and returns an unsubscribe function; a plain value is written once and
 * returns null.
 */
export declare function bindText(element: Element, value: unknown): (() => void) | null;

/**
 * Element mode: `child(<expression>)` — text semantics only.
 *
 * Strings / numbers / handles / zero-argument readers write into the placeholder, arrays are
 * flattened into several text nodes. Nodes and component objects throw: the element channel has
 * no view nodes, so such a unit must be compiled with `mode: 'node'`.
 */
export declare function bindChildText(element: Element, value: unknown): (() => void) | null;

/** Element mode: toggle a class, same semantics as `toggleClass(name, value)`. */
export declare function bindClass(
  element: Element,
  name: string,
  value: unknown
): (() => void) | null;

/** Element mode: merge a dynamic class text (same semantics as `className(value)`). */
export declare function addClassText(element: Element, value: unknown): (() => void) | null;

/** Element mode: dynamic attribute, same semantics as the core `applyAttribute`. */
export declare function setAttr(
  element: Element,
  name: string,
  value: unknown
): (() => void) | null;

/** Element mode: `mountable(value)` — keep the element in place and toggle its presence. */
export declare function mountableAt(element: Element, value: unknown): (() => void) | null;

/** Node mode: dispatch a dynamic argument through the core `applySetupValue`. */
export declare function applyDynamicArg(node: ViewNode, value: unknown): unknown;

/** Element mode: a dynamic argument has no node object, so it lands as text (arrays flatten). */
export declare function applyDynamicChild(container: Element, value: unknown): unknown;

/** Collect an unsubscribe function (ignores plain values). */
export declare function pushOff<T>(offs: Array<() => void>, off: T): T;

/** A registry entry produced by the component compiler. */
export interface CompiledComponentEntry {
  hash: string;
  /** Positional writes onto the caller's embedded fragment; null means "shape mismatch, fall back". */
  bind(root: Element, values: unknown[]): (() => void) | null;
  /** Generic-path fallback: the original component factory. */
  render(...values: unknown[]): unknown;
  plan?: CompiledPlan;
}

/**
 * Link a component call site: use the registered fragment writes when the entry hash matches and
 * the shape check passes, otherwise fall back to the original component (and throw a descriptive
 * error when the entry is missing entirely).
 */
export declare function bindComponent(
  entry: CompiledComponentEntry | undefined,
  slot: Element | null,
  values?: unknown[],
  expectedHash?: string | null
): () => void;

/** Element mode: instantiate a registry entry into a standalone row (`{ el, destroy }`). */
export declare function instantiateComponent(
  entry: CompiledComponentEntry | undefined,
  values?: unknown[]
): CompiledRow;

/** Node mode: instantiate a registry entry into a `ViewNode` (the entry's `render`). */
export declare function instantiateComponentNode(
  entry: CompiledComponentEntry | undefined,
  values?: unknown[]
): ViewNode;

/** Element mode: reconcile a keyed row list in a container (source may be an array or a handle). */
export declare function keyedRows(
  container: Element,
  keyOf: ((item: unknown) => unknown) | null,
  source: unknown,
  build: (item: unknown) => CompiledRow
): (() => void) | null;

/**
 * Element-mode list reconciliation: element array plus a key → index map, reusing
 * rows, rebuilding in place, removing leavers and moving only what changed.
 *
 * `options.keyAttribute` writes a key mirror onto each row element when set; it
 * stays off by default because the row DOM must match the reference
 * implementation byte for byte (open it when you need to locate rows by key).
 */
export declare function createElementList<Data>(
  container: Element,
  keyOf: (item: Data) => unknown,
  options?: { keyAttribute?: string }
): CompiledList<Data>;
