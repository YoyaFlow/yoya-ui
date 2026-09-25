/**
 * Entry types for `yoya-ui/compiled-registry`: the library's own prebuilt component registry.
 *
 * It is a **separate subpath** on purpose — the core, UI and root entries never import it, so a page
 * that does not link library components pays nothing for it. The compiler plugin loads it by this
 * specifier when the project did not pass its own `components`.
 *
 * Keys are `<package-name>#<export>` (`@yoyaflow/yoya-ui#vCard`), so importing a component from any
 * entry of the package (`.` / `/ui` / `/data-display`) resolves to the same entry.
 */
import type { CompiledPlan } from './compiler-runtime.js';

/** One linkable library component. */
export interface CompiledRegistryComponent {
  /** Positional writes onto the caller's embedded fragment; null means "shape mismatch, fall back". */
  bind(root: Element, values?: unknown[], options?: unknown): (() => void) | null;
  /** Generic-path fallback: the original library component. */
  render(...values: unknown[]): unknown;
  /** Content hash of the component function source. */
  hash: string;
  /** Source label of the component (relative, for traceability). */
  file: string;
  /** Export name inside that module. */
  export: string;
  /** Fragment shape summary (`liveNodes` / `slots`) used by the shape guard. */
  plan: Pick<CompiledPlan, 'html' | 'liveNodes' | 'slots'>;
}

/** The registry the plugin passes around as `components`. */
export declare const components: Record<string, CompiledRegistryComponent>;

/** Core entry the prebuilt entries were compiled against (a project may not mix a different one). */
export declare const coreSpecifier: string;

/** Runtime hook entry the prebuilt entries import. */
export declare const runtimeSpecifier: string;

/** Registry schema version. */
export declare const registryVersion: number;
