/**
 * 编译入口：读一份源码 → 结构分析 → 生成 plan 与运行期模块。
 *
 * `compiled: false` 表示「这个形状走通用路径」——只要有任何 bail，就必须整体回落：
 * 片段里少一个节点是静默的语义错误，比不编危险得多。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { analyzeSource } from './analyze.js';
import { renderModule } from './emit.js';
import { lookupComponent, lookupLocalComponent } from './component-key.js';
import { sourceLabelOf } from './emit.js';

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
    // 目标组件名由调用方给出（插件按组件边界自动发现后传进来）；编译器不认识任何业务函数名。
    fn,
    mode = 'element',
    thin = false,
    core,
    runtime = DEFAULT_RUNTIME,
    whitelist,
    components = null,
    componentsSpecifier,
    kind = 'row',
    className = null,
    scopeSpecifier = null,
    paramsSource = '',
    hash = null,
    coreSpecifier = undefined,
    templatesOnly = false,
    // `keyed` 行子单元的模块路径：构建期插件给（每行一个），CLI 路径不给 → 该形状回落
    rowSpecifier = null,
    // 结构锚点的子单元模块路径（`if` / `for…of` 里的结构，每段一个）：同样由插件给
    controlSpecifier = null,
    // 节点模式：产物根即使纯静态也返回 ViewNode（结构锚点的子单元要被父节点 `child(...)` 收养）
    nodeAlways = false,
    // 调用点链接的口径：`bind`（注册表 + bindComponent + 哈希回落）或 `inline`（同模块内联）
    linking = 'bind',
    // 元素通道 → 节点通道的自动切换开关（内部用：换完这一遍就不再换，防重入）
    allowChannelSwitch = true,
    // 额外的作用域名字（内联进来的子组件用到的模块级名字：调用方产物一并解构出来）
    scopeExtras: extraScope = []
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
    bails: [],
    factory: null,
    ops: null,
    perCallScope: [],
    hash: null,
    fragmentHtml: null
  };

  // 调用点链接：`child(<组件>(…))` 命中注册表 → 生成链接代码；未命中 → 今天的通用路径。
  // 同模块（本地顶层组件）与跨模块（import 进来的组件）用同一个注册表、两种查找口径。
  const label = sourceLabelOf(file);
  const resolveComponent = components
    ? (name, importInfo) =>
        importInfo
          ? lookupComponent(components, {
              file: label,
              specifier: importInfo.specifier,
              imported: importInfo.imported
            })
          : lookupLocalComponent(components, { file: label, export: name })
    : null;

  const analysis = analyzeSource(source, {
    fn,
    className,
    kind,
    mode,
    whitelist: registry,
    resolveComponent
  });
  result.bails = analysis.bails;
  if (!analysis.entry || result.bails.length > 0) {
    return result;
  }

  // 视图变量被读过（`view.attr(…)` 这类运行期操作）→ 产物必须是**节点**：
  // 元素通道的产物是 `{ el, … }`，撑不起原文对它的用法。这不是"能不能编"的问题，
  // 只是通道选择（票 21 §2.1.3）：换到节点通道重来一遍（`allowChannelSwitch` 防重入）。
  if (mode === 'element' && analysis.needsNodeProduct && allowChannelSwitch) {
    return compileSource({
      ...options,
      mode: 'node',
      nodeAlways: true,
      allowChannelSwitch: false
    });
  }

  // `keyed` 的行工厂子单元：**先编译**（产物形态与普通行单元完全一致），再渲染主模块——
  // 主模块要 import 它们的 `createRowFactory`。
  const rowResults = [];
  let rowScopeExtras = [];
  if (analysis.entry.rows?.length > 0) {
    analysis.entry.rows.forEach((row) => {
      const nested = compileSource({
        source: row.source,
        file,
        fn: row.fn,
        // 行子单元的通道跟父一致：element 走元素行对账，node 走节点自己的 keyed
        mode,
        core,
        runtime,
        whitelist: registry,
        // 子单元要跟父产物**同一个核心入口**：不传就会退回包默认（`@yoyaflow/yoya-core`），
        // 调用方自定义了 `coreSpecifier`（monorepo 走源码 / 别名）时就是两份核心实例——
        // 冻结哨兵、信号适配器都会错位，产物在运行期直接炸。
        coreSpecifier,
        rowSpecifier,
        kind: 'row'
      });
      rowResults.push({ ...row, ...nested });
    });
    result.rows = rowResults;
    const failed = rowResults.find((row) => !row.compiled);
    if (failed) {
      // 行工厂编不了 = 这个形状整体回落（不半编）
      result.bails = failed.bails.map((bail) => ({
        ...bail,
        reason: `keyed() 的行工厂不可编：${bail.reason}`
      }));
      result.rows = null;
      return result;
    }
    if (typeof rowSpecifier !== 'function') {
      result.bails = [
        {
          reason: 'keyed() 需要构建期插件提供行子单元的模块路径（CLI 路径暂不支持行子单元落盘）',
          at: null
        }
      ];
      result.rows = null;
      return result;
    }
    // 行单元需要的名字也要由父模块解构出来（父产物把同一份 scope 交给行工厂）
    rowScopeExtras = [...new Set(rowResults.flatMap((row) => row.scope ?? []))];
  }

  // 结构锚点的子单元（`if` / `for…of` 里的结构）：与行子单元同一套——先编出来，父产物 import
  // 它们的 `createRowFactory`，运行期按“片段里它后面的那个兄弟”当边界插回去。
  const controlResults = [];
  let controlFrames = [];
  if (analysis.entry.controls?.length > 0) {
    analysis.entry.controls.forEach((unit) => {
      const nested = compileSource({
        source: unit.source,
        file,
        fn: unit.fn,
        // 通道跟父一致：element 的产物是 { el, destroy }，node 的产物是 ViewNode
        mode,
        core,
        runtime,
        whitelist: registry,
        coreSpecifier,
        rowSpecifier,
        controlSpecifier,
        // 节点通道的子单元要被父节点收养（`node.child(...)`）→ 静态根也要是 ViewNode
        nodeAlways: mode === 'node',
        kind: 'row'
      });
      controlResults.push({ ...unit, ...nested });
    });
    const failedControl = controlResults.find((unit) => !unit.compiled);
    if (failedControl) {
      result.bails = failedControl.bails.map((bail) => ({
        ...bail,
        reason: `条件 / 循环里的结构不可编：${bail.reason}`
      }));
      return result;
    }
    if (typeof controlSpecifier !== 'function') {
      result.bails = [
        {
          reason: '条件 / 循环里的结构需要构建期插件提供子单元模块路径（CLI 路径暂不支持）',
          at: null
        }
      ];
      return result;
    }
    // 子单元的自由标识符 = 父产物按帧传进去的名字（父的形参 / 局部量 / 模块级名字都算）。
    // 注意**不能**并进父产物的 scope：`item` 这类是父产物自己的局部量（在产物里声明）。
    controlFrames = controlResults.map((unit) => unit.scope ?? []);
    result.controls = controlResults;
  }

  // 子单元（行 / 锚点）自己需要节点产物时，父必须跟着换通道——元素通道的列表对账器只认
  // `{ el, … }`，父用元素、子用节点就会错配。换通道后重跑一遍（防重入）。
  const nestedNeedsNode = [...rowResults, ...controlResults].some(
    (nested) => nested.compiled && nested.plan?.mode === 'node'
  );
  if (mode === 'element' && nestedNeedsNode && allowChannelSwitch) {
    return compileSource({
      ...options,
      mode: 'node',
      nodeAlways: true,
      allowChannelSwitch: false
    });
  }

  try {
    const rendered = renderModule({
      core,
      entry: analysis.entry,
      mode,
      thin,
      file,
      fn,
      runtime,
      kind,
      // 形态 C 的骨架：调用方带内容时构件不写（bind 返回 null），由调用方回落通用路径
      contentGuard: analysis.entry.hasContent === true,
      componentsSpecifier,
      scopeSpecifier,
      paramsSource,
      hash,
      coreSpecifier,
      templatesOnly,
      linking,
      scopeExtras: [...rowScopeExtras, ...extraScope],
      rowSpecifiers: result.rows ? result.rows.map((row) => rowSpecifier(row.index, row)) : [],
      controlSpecifiers: controlResults.map((unit) => controlSpecifier(unit.index, unit)),
      controlFrames,
      nodeAlways
    });
    result.compiled = true;
    result.plan = rendered.plan;
    result.module = rendered.module;
    result.scope = rendered.scope;
    result.factory = analysis.entry.factory;
    result.ops = analysis.entry.ops;
    // scope 里那些**每次调用都可能不同**的名字（组件体局部量：实例变量 / 常量）。
    // 就地替换路径把它们放进 `createRowFactory({ … })` 的对象字面量（在函数体里求值，闭包可见）；
    // 插件据此判断能不能把工厂缓存到模块级——缓存会把第一次调用时的实例留给下一位调用者。
    result.perCallScope = rendered.scope.filter(
      (name) => analysis.entry.localNames?.has(name) === true
    );
    // 结构表达式的源码区间 + 形状：构建期插件按它**就地替换**视图（票 02）
    result.structure = analysis.entry.structure ?? null;
    result.hash = hash;
    // 始终带片段 HTML 的字段：`--templates-only` 时 plan 省略 html，模板块仍从它写
    result.fragmentHtml = rendered.fragmentHtml;
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
  const { file, out, fragmentsOut = null, ...rest } = options;
  const result = compileSource({ ...rest, source: readFileSync(file, 'utf8'), file });

  if (result.compiled && out) {
    // 新项目里 `--out src/generated/row.js` 直接用：目录不存在就建出来（别让用户先手建）
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, result.module, 'utf8');
  }

  // 票 45：模板块由**编译器**顺手写出（片段仍来自框架序列化）——下游脚本不必从产物里抠 plan.html
  if (result.compiled && fragmentsOut) {
    mkdirSync(dirname(fragmentsOut), { recursive: true });
    writeFileSync(
      fragmentsOut,
      `${fragmentBlockOf(result.fragmentHtml, result.plan.signature)}\n`,
      'utf8'
    );
  }

  return {
    ...result,
    out: result.compiled ? (out ?? null) : null,
    fragmentsOut: result.compiled ? (fragmentsOut ?? null) : null
  };
}

/**
 * 页面里的 inert 模板块：`<template data-yoya-fragment="<签名>">片段</template>`。
 * 片段与签名分开传：`--templates-only` 时 plan 不再内联 html，模板块仍要从 `fragmentHtml` 写出来。
 */
export function fragmentBlockOf(html, signature) {
  return `<template data-yoya-fragment="${signature}">${html}</template>`;
}

/** CLI / 日志用的一行摘要（不含生成源码）。 */
export function summarizeCompile(result) {
  return {
    file: result.file,
    fn: result.fn,
    mode: result.mode,
    compiled: result.compiled,
    out: result.out ?? null,
    // templates-only 时 plan 不带 html，片段字节数从 fragmentHtml 取
    htmlBytes: result.fragmentHtml?.length ?? 0,
    liveNodes: result.plan ? result.plan.liveNodes : 0,
    slots: result.plan ? result.plan.slots : 0,
    scope: result.scope,
    bails: result.bails
  };
}
