/**
 * 编译入口：读一份源码 → 结构分析 → 生成 plan 与运行期模块。
 *
 * `compiled: false` 表示「这个形状走通用路径」——只要有任何 bail，就必须整体回落：
 * 片段里少一个节点是静默的语义错误，比不编危险得多。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeSource } from './analyze.js';
import { renderModule } from './emit.js';

/** 生成模块默认从同目录的运行期入口拿钩子（即 `yoya-ui/compiler-runtime` 的产物位置）。 */
export const DEFAULT_RUNTIME = './compiler-runtime.js';

/**
 * 元素 / 组件注册表：元素工厂白名单**由核心真正注册的 HTML / SVG 工厂推导**，
 * 白名单外的一律 bail。没有这张表，`vCard(...)` / `vNode(...)` 会被当成元素静默编错。
 */
export function elementWhitelistOf(core) {
  return new Set([...Object.keys(core?.htmls ?? {}), ...Object.keys(core?.svgs ?? {})]);
}

/**
 * 编译源码文本。
 *
 * @param {object} options
 * @param {string} options.source 源码文本（唯一真源，编译器不执行它）
 * @param {string} [options.file] 来源文件名（写进 plan，供追溯）
 * @param {string} [options.fn] 目标构建函数名
 * @param {'element'|'node'} [options.mode] 产物通道
 * @param {boolean} [options.thin] 节点模式：只给直接带活内容的节点建包装对象
 * @param {object} options.core 核心入口模块命名空间（提供工厂 + `htmls` / `svgs`）
 * @param {string} [options.runtime] 生成模块里 import 运行期钩子的路径
 * @param {Set<string>} [options.whitelist] 显式覆盖白名单（默认由 core 推导）
 */
export function compileSource(options) {
  const {
    source,
    file = '(inline)',
    fn = 'buildRow',
    mode = 'element',
    thin = false,
    core,
    runtime = DEFAULT_RUNTIME,
    whitelist
  } = options;

  const registry = whitelist ?? elementWhitelistOf(core);
  const result = {
    file,
    fn,
    mode,
    compiled: false,
    plan: null,
    module: null,
    scope: [],
    bails: []
  };

  const analysis = analyzeSource(source, { fn, whitelist: registry });
  result.bails = analysis.bails;
  if (!analysis.entry || result.bails.length > 0) {
    return result;
  }

  try {
    const rendered = renderModule({ core, entry: analysis.entry, mode, thin, file, fn, runtime });
    result.compiled = true;
    result.plan = rendered.plan;
    result.module = rendered.module;
    result.scope = rendered.scope;
  } catch (error) {
    result.bails = [{ reason: `生成失败：${error.message}`, at: null }];
  }

  return result;
}

/**
 * 编译一个文件：可编时把生成模块写到 `out`；不可编时不落盘、返回 bail 原因。
 * 返回结构与 `compileSource` 一致，`out` 为实际写入的路径（未写时为 null）。
 */
export function compileFile(options) {
  const { file, out, ...rest } = options;
  const result = compileSource({ ...rest, source: readFileSync(file, 'utf8'), file });

  if (result.compiled && out) {
    writeFileSync(out, result.module, 'utf8');
  }

  return { ...result, out: result.compiled ? (out ?? null) : null };
}

/** CLI / 日志用的一行摘要（不含生成源码）。 */
export function summarizeCompile(result) {
  return {
    file: result.file,
    fn: result.fn,
    mode: result.mode,
    compiled: result.compiled,
    out: result.out ?? null,
    htmlBytes: result.plan ? result.plan.html.length : 0,
    liveNodes: result.plan ? result.plan.liveNodes : 0,
    slots: result.plan ? result.plan.slots : 0,
    scope: result.scope,
    bails: result.bails
  };
}
