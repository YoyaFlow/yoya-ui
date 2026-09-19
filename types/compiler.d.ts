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

export declare function reportCoverage(
  options: Omit<CompileOptions, 'source'> & { root: string; extensions?: string[] }
): CoverageReport;

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
