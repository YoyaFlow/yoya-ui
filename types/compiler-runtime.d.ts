/**
 * `yoya-ui/compiler-runtime`: runtime hooks for compiler-generated modules.
 *
 * Compiler output imports this subpath instead of the main entry, so a page that
 * never uses the compiler pays nothing for it. The hooks mirror the core's own
 * "adopt existing DOM" path (hydrate): the fragment comes from the framework's
 * serializer, the hooks only write values and reconcile lists.
 */

import type { ViewNode } from './core.js';

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

/** Node mode: attach an existing element (and its text nodes) to a wrapper node. */
export declare function adopt<T extends ViewNode>(
  node: T,
  element: Element,
  textNodes?: Array<Text | null>
): T;

/** Node mode: bind a handle or write a plain value into an existing text node. */
export declare function bindChild(node: ViewNode, textNode: Text, value: unknown): void;

export declare function appendNodeChild(parent: ViewNode, child: ViewNode): unknown;

/**
 * Element mode: write a text position. A handle (or zero-argument reader) stays
 * live and returns an unsubscribe function; a plain value is written once and
 * returns null.
 */
export declare function bindText(element: Element, value: unknown): (() => void) | null;

/** Element mode: toggle a class, same semantics as `toggleClass(name, value)`. */
export declare function bindClass(
  element: Element,
  name: string,
  value: unknown
): (() => void) | null;

/** Element mode: dynamic attribute, same semantics as the core `applyAttribute`. */
export declare function setAttr(
  element: Element,
  name: string,
  value: unknown
): (() => void) | null;

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

/**
 * Element-mode list reconciliation: element array plus a key → index map, reusing
 * rows, rebuilding in place, removing leavers and moving only what changed.
 */
export declare function createElementList<Data>(
  container: Element,
  keyOf: (item: Data) => unknown
): CompiledList<Data>;
