/**
 * yoya-ui devtools type declarations.
 *
 * The devtools runtime ships as a separate entry so the production main
 * bundle never contains the debug surface. All hooks are opt-in and are
 * no-ops until `enableDevtools()` is called.
 */

import type { ViewNode } from './core.js';

/** Base shape shared by every devtools lifecycle event. */
export interface DevtoolsEventBase {
  /** Event kind: 'commit' | 'destroy' (extended by update/state kinds). */
  type: string;
  /** The view node the event belongs to, when one exists. */
  node?: unknown;
}

/** Emitted when a node is first rendered (or re-committed). */
export interface DevtoolsCommitEvent extends DevtoolsEventBase {
  type: 'commit';
}

/** Emitted when a node is destroyed. */
export interface DevtoolsDestroyEvent extends DevtoolsEventBase {
  type: 'destroy';
}

/** Lifecycle events currently emitted by the devtools hook. */
export type DevtoolsEvent = DevtoolsCommitEvent | DevtoolsDestroyEvent;

/** Listener callback for the devtools event stream. */
export type DevtoolsListener = (event: DevtoolsEvent) => void;

/** Turns the devtools event stream on. Returns the new enabled state. */
export function enableDevtools(): boolean;

/** Turns the devtools event stream off. Returns the new enabled state. */
export function disableDevtools(): boolean;

/** Whether the devtools event stream is currently enabled. */
export function isDevtoolsEnabled(): boolean;

/**
 * Subscribes to lifecycle events emitted while devtools is enabled.
 * Returns an unsubscribe function; listener errors never break rendering.
 */
export function subscribeDevtools(listener: DevtoolsListener): () => void;

/** Attribute values reflected from the node's attribute map. */
export type DevtoolsAttrValue = string | number | boolean;

/** Plain-shape snapshot of a node subtree for inspection. */
export interface DevtoolsSnapshot {
  /** Node kind: element | text | component | view | root. */
  kind: string;
  /** Stable per-node identifier assigned while devtools is active. */
  id?: number;
  /** Element tag name for element nodes. */
  tagName?: string;
  /** Element attribute map, including the mirrored class attribute. */
  attrs?: Record<string, DevtoolsAttrValue>;
  /** Text content for text nodes. */
  text?: string;
  /** Child snapshots. */
  children: DevtoolsSnapshot[];
}

/** Returns a plain-shape snapshot of a node subtree. */
export function getDevtoolsSnapshot(root: ViewNode | null): DevtoolsSnapshot;

/**
 * Returns the rendered DOM node for a snapshot id (element or text node),
 * or null when the node is not rendered or has been destroyed.
 */
export function getDevtoolsDom(id: number): Element | Text | null;
