/**
 * `yoya-ui/compiler`: the build-time AST compiler (Node only).
 *
 * The compiler reads your source, derives a static fragment from the framework's
 * own serializer and emits a module that only writes live values. It never runs
 * your code, never guesses: anything it does not understand bails and the shape
 * falls back to the generic path.
 */

import type { CompiledPlan } from './compiler-runtime.js';

/** A reason a shape fell back to the generic path. */
export interface CompileBail {
  reason: string;
  /** Source excerpt (≤80 chars) where the construct was found, or null. */
  at: string | null;
}

export interface CompileResult {
  file: string;
  fn: string;
  mode: 'element' | 'node';
  /** False means "this shape keeps using the generic path" — no artifact is written. */
  compiled: boolean;
  plan: CompiledPlan | null;
  /** Generated module source (null when the shape bailed). */
  module: string | null;
  /** Identifiers the generated module expects on the scope object it is given. */
  scope: string[];
  bails: CompileBail[];
  /** Registry entries: the view factory and its pure-data ops (null when the shape bailed). */
  factory: string | null;
  ops: unknown[] | null;
  /** Component artifacts only: content hash of the component function (the caller pins it). */
  hash: string | null;
}

export interface CompileOptions {
  /** Source text (the single source of truth; it is parsed, never executed). */
  source: string;
  file?: string;
  fn?: string;
  mode?: 'element' | 'node';
  /** Node mode only: wrap live nodes and their ancestors, nothing else. */
  thin?: boolean;
  /** Core entry namespace providing the element factories plus `htmls` / `svgs`. */
  core: unknown;
  /** Specifier the generated module imports its runtime hooks from. */
  runtime?: string;
  /** Explicit element whitelist override (defaults to the core registry). */
  whitelist?: Set<string>;
  /** Component registry data (`buildComponentRegistry().registry`) for call-site linking. */
  components?: ComponentRegistry | null;
  /** Specifier the generated caller imports the registry module from. */
  componentsSpecifier?: string;
}

/** One component compile unit: where the component lives and which export it is. */
export interface ComponentEntry {
  file: string;
  export: string;
}

export interface ComponentRegistryEntry {
  file: string;
  export: string;
  hash: string;
  factory: string;
  /** Pure-data ops of the component subtree; the caller embeds them into its own fragment. */
  ops: unknown[];
  plan: { html: string; liveNodes: number; slots: number };
  scope: string[];
  /** The generated instantiation module, relative to the registry module. */
  entry: string;
}

/** Pure-data component registry (serializable, cacheable, no instances). */
export interface ComponentRegistry {
  version: number;
  runtime: string;
  components: Record<string, ComponentRegistryEntry>;
}

export interface ComponentRegistryOptions {
  entries: ComponentEntry[];
  /** Output directory for the instantiation modules plus the registry module / data. */
  dir: string;
  core: unknown;
  runtime?: string;
  registryName?: string;
  dataName?: string;
  whitelist?: Set<string>;
}

export interface ComponentRegistryResult {
  registry: ComponentRegistry;
  written: string[];
  skipped: Array<{ key: string; bails: CompileBail[] }>;
}

export type CompileFileOptions = CompileOptions & { file: string; out?: string };

export interface CoverageEntry {
  file: string;
  skipped: boolean;
  compiled: boolean;
  reasons: string[];
}

export interface CoverageReport {
  root: string;
  fn: string;
  mode: 'element' | 'node';
  files: number;
  candidates: number;
  compiled: number;
  bailed: number;
  skipped: number;
  /** Bail histogram, most frequent first. */
  bails: Array<{ reason: string; count: number }>;
  entries: CoverageEntry[];
}

/** Element/component registry: the element whitelist derived from `htmls` / `svgs`. */
export declare function elementWhitelistOf(core: unknown): Set<string>;

export declare function compileSource(options: CompileOptions): CompileResult;

export declare function compileFile(
  options: CompileFileOptions
): CompileResult & { out: string | null };

/** CLI summary of a compile (the shape printed by `--json`). */
export declare function summarizeCompile(
  result: CompileResult & { out?: string | null }
): Record<string, unknown>;

export declare function analyzeSource(
  source: string,
  options?: { fn?: string; whitelist?: Set<string> }
): { entry: unknown | null; bails: CompileBail[] };

export declare function freeIdentifiers(expressionSource: string, bound?: Set<string>): Set<string>;

/** Compile one leaf component (shapes A / B / vNode without commands) into a link artifact. */
export declare function compileComponent(
  options: CompileOptions & { file: string; export: string; scopeSpecifier?: string | null }
): CompileResult;

/** Compile a set of leaf components and write the registry module + pure-data registry. */
export declare function buildComponentRegistry(
  options: ComponentRegistryOptions
): ComponentRegistryResult;

/** Registry key helpers: `<module path>#<export>` (call sites resolve relative specifiers). */
export declare function componentKeyOf(file: string, exportName: string): string;
export declare function resolveComponentKey(options: {
  file: string;
  specifier: string;
  export: string;
}): string;
export declare function normalizeModulePath(path: string): string;

export declare function reportCoverage(
  options: Omit<CompileOptions, 'source'> & { root: string; extensions?: string[] }
): CoverageReport;

/** One scanned target inside a committed coverage baseline. */
export interface CoverageBaselineTarget {
  root: string;
  fn: string;
  mode: 'element' | 'node';
  files: number;
  candidates: number;
  compiled: number;
  bailed: number;
  skipped: number;
  /** Files that compiled when the baseline was taken (the per-file, monotone gate). */
  compiledFiles: string[];
  bails: Array<{ reason: string; count: number }>;
}

/** `coverageBaselineOf(reports)`: serializable, committed and diffable. */
export interface CoverageBaseline {
  version: number;
  targets: CoverageBaselineTarget[];
}

export interface CoverageComparison {
  ok: boolean;
  /** Baseline-compiled files that fell back (empty when `ok`). */
  regressions: Array<{ root: string; file: string; reason: string }>;
  /** Files that compile now but did not in the baseline (coverage only grows). */
  added: Array<{ root: string; file: string }>;
}

export declare function coverageBaselineOf(reports: CoverageReport[]): CoverageBaseline;

export declare function compareCoverageBaseline(
  baseline: CoverageBaseline | null,
  reports: CoverageReport[]
): CoverageComparison;

export declare function runCli(
  argv?: string[],
  io?: {
    log?: (line: string) => void;
    error?: (line: string) => void;
    core?: unknown;
  }
): Promise<number>;

/** Default core namespace used when no `--core` override is given. */
export declare const defaultCore: unknown;
