/**
 * Entry types for `yoya-ui/signals-preact`.
 */
import type { SignalsAdapter } from './core.js';

/** Creates a signals engine adapter backed by the given `@preact/signals-core` module. */
export function createPreactAdapter(signalsCore: unknown): SignalsAdapter;
