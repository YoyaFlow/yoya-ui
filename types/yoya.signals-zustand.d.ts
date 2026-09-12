/**
 * Entry types for `yoya-ui/signals-zustand`.
 */
import type { SignalsAdapter } from './core.js';

/** Creates a signals engine adapter backed by the given `zustand/vanilla` module. */
export function createZustandAdapter(zustand: unknown): SignalsAdapter;
