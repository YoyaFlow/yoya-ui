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

/**
 * One component wired at build time: the module that holds it and the component
 * declaration name. `wireComponentModule` locates it (a single declaration, a single
 * identifier parameter) and rewrites the module in place, so the source keeps its
 * original shape and the artifact stays a virtual module.
 */
export interface ComponentUnit {
  /** Absolute or cwd-relative module path. */
  file: string;
  /** Component declaration name (a business-side name: the discovery rule reports it, nothing hardcodes it). */
  component: string;
  mode?: 'element' | 'node';
  /** Node mode only: wrap live nodes and their ancestors. */
  thin?: boolean;
  /** Element mode only: emit fragments as page `<template>` blocks. */
  templatesOnly?: boolean;
}

/**
 * Result of `wireComponentModule`. `map` is the hires source map of the rewritten module
 * (the rewrite must not break stack traces), `moduleMap` the approximate map of the
 * generated artifact back onto the row function it came from.
 */
export interface WiredRowModule {
  code: string;
  map: unknown;
  module: string;
  moduleMap: unknown | null;
  virtual: string;
}

/** Alias kept for the 0.6.11 name. */
export type RowTarget = ComponentUnit;

/**
 * Pure half of the build-time transform: given the module source and one or more component
 * declarations, returns the rewritten module plus the artifact modules, or `null` when none
 * of them can be identified or their shapes bail (the source is left alone).
 */
export declare function wireComponentModule(options: {
  source: string;
  target?: ComponentUnit | null;
  targets?: ComponentUnit[] | null;
  core: unknown;
  runtime?: string;
  coreSpecifier?: string;
  virtualId?: string;
}): WiredRowModule | null;

/** Alias kept for the 0.6.11 name. */
export declare const wireRowModule: typeof wireComponentModule;

/**
 * Default discovery rule: top-level factories that return a UI view are compile units
 * (PascalCase components and camelCase shortcut factories alike). The channel is inferred from
 * usage — a component handed to the core `keyed` becomes an `element` unit, anything else a `node` one.
 */
export declare function componentUnits(
  source: string,
  options: {
    core: unknown;
    file?: string;
    mode?: 'element' | 'node' | null;
    thin?: boolean;
    templatesOnly?: boolean;
  }
): ComponentUnit[];

/** Alias kept for the 0.6.11 name. */
export declare const viewFactoryUnits: typeof componentUnits;

export interface YoyaCompilePluginOptions {
  /** Core namespace (`import * as core from '@yoyaflow/yoya-ui/core'`). */
  core: unknown;
  /**
   * Library-internal escape hatch: force specific components. Optional — without it the default
   * rule applies: every module handed to the plugin (node_modules skipped) contributes its
   * top-level factories that return a UI view. When given, only these units are used.
   */
  units?: ComponentUnit[];
  /** Force one channel for every discovered unit (default: inferred from usage). */
  mode?: 'element' | 'node' | null;
  /** Node-mode `--thin` for the default rule. */
  thin?: boolean;
  /** Element-mode templates-only for the default rule. */
  templatesOnly?: boolean;
  /** Path patterns (string = substring, or RegExp) the default rule never touches. */
  exclude?: Array<string | RegExp>;
  /** Runtime hook specifier; defaults to `@yoyaflow/yoya-ui/compiler-runtime` (bundler context). */
  runtime?: string;
  /** Module specifier the artifact imports its element factories from. */
  coreSpecifier?: string;
  /** Optional callback per generated artifact (tests / debugging). */
  onArtifact?: ((name: string, source: string) => void) | null;
}

/** Bundler plugin object produced by one of the `yoyaCompile` adapters. */
export interface YoyaCompilePlugin {
  name: string;
  [hook: string]: unknown;
}

/**
 * The unplugin instance: write the transform once, get every bundler's entry —
 * `yoyaCompile.vite(options)` / `.rollup(…)` / `.webpack(…)` / `.esbuild(…)` /
 * `.rspack(…)` / `.rolldown(…)` / `.farm(…)`. Listed modules are rewritten at build
 * time (with source maps) and the artifacts are served as virtual modules; anything
 * it cannot pin down is left as-is and runs on the generic path.
 */
export declare const yoyaCompile: {
  vite(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  rollup(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  webpack(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  esbuild(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  rspack(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  rolldown(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
  farm(options: YoyaCompilePluginOptions): YoyaCompilePlugin;
};

/** Convenience alias for `yoyaCompile.esbuild(options)` (kept for existing esbuild configs). */
export declare function yoyaCompilePlugin(options: YoyaCompilePluginOptions): YoyaCompilePlugin;

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
