/**
 * 覆盖率扫描：对一个目录里的候选文件逐个试编，输出「可编 / 回落」占比与 bail 原因直方图。
 *
 * 用途是**取舍依据**：先看清一个代码库里哪些形状能编、卡在哪些构造上，再决定给哪些
 * 组件写编译路径；扫描本身不改任何源码。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from '@babel/parser';
import { compileSource, elementWhitelistOf } from './compile.js';
import { componentUnits } from './discover.js';
// 注意：这里必须走 `plugin-core.js`（不 import unplugin）。`report.js` 被根入口 re-export，
// 一旦这里 import `./plugin.js`，CLI / 程序化 API 在 Node 18 / 20.9 上会连包都加载不进来。
import { compileModuleRegistry } from './plugin-core.js';
import { topLevelFunctions } from './discover.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.scratch', '.cache']);

function walk(root, extensions) {
  const files = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          visit(path);
        }
        continue;
      }
      if (extensions.some((extension) => entry.name.endsWith(extension))) {
        files.push(path);
      }
    }
  };

  visit(root);
  return files;
}

/**
 * 扫描一个目录。
 *
 * @param {object} options
 * @param {string} options.root 目录
 * @param {string} [options.component] 只统计这个组件（库内逃生口；不给就按组件边界发现全部）
 * @param {'element'|'node'} [options.mode] 产物通道
 * @param {object} options.core 核心入口命名空间
 * @param {string[]} [options.extensions] 参与扫描的扩展名
 */
export function reportCoverage(options) {
  const {
    root,
    component = null,
    mode = null,
    thin = false,
    core,
    whitelist,
    runtime,
    extensions = ['.js', '.mjs']
  } = options;

  const registry = whitelist ?? elementWhitelistOf(core);
  const files = walk(root, extensions);
  const histogram = new Map();
  const entries = [];
  let candidates = 0;
  let compiled = 0;
  let bailed = 0;
  let skipped = 0;

  const toRelative = (file) => relative(root, file).split(sep).join('/');

  for (const file of files) {
    const name = toRelative(file);
    const source = readFileSync(file, 'utf8');

    // 按**组件边界**发现（顶层返回 UI 视图的工厂）：编译器不认识任何具体函数名。
    const discovered = componentUnits(source, { core, file: name, mode: mode ?? undefined, thin });
    const units = component
      ? discovered.filter((unit) => unit.component === component)
      : discovered;
    if (units.length === 0) {
      skipped += 1;
      entries.push({ file: name, skipped: true, compiled: false, reasons: [] });
      continue;
    }

    candidates += 1;
    const reasons = new Set();
    let allCompiled = true;
    // 同模块组件注册表：**与插件同一份实现**——扫描要测"插件那条路能不能编"，
    // 所以同模块的 `child(<组件>(…))` 链接也要在扫描里生效（覆盖 scan 的 `componentsSpecifier` 用占位）。
    const ast = parse(source, { sourceType: 'module' });
    const { registryData } = compileModuleRegistry({
      ast,
      source,
      list: units,
      declarations: new Map(topLevelFunctions(ast).map((entry) => [entry.name, entry])),
      core,
      runtime,
      fileLabelOf: () => name
    });
    units.forEach((unit) => {
      const result = compileSource({
        source,
        file: name,
        fn: unit.component,
        mode: unit.mode,
        thin: unit.thin,
        core,
        whitelist: registry,
        runtime,
        // 扫描测的是**形状能不能编**：`keyed` 行工厂 / 条件锚点的子单元路径由构建期插件提供
        // （CLI 目前不落子单元文件），所以这里给占位路径，别把"接线缺失"记成"形状编不了"。
        rowSpecifier: (index) => `\0yoya-scan:${name}#row${index}`,
        controlSpecifier: (index) => `\0yoya-scan:${name}#ctl${index}`,
        components: registryData(),
        componentsSpecifier: `\0yoya-scan:${name}#registry`
      });
      if (!result.compiled) {
        allCompiled = false;
        result.bails.forEach((bail) => reasons.add(bail.reason));
      }
    });

    if (allCompiled) {
      compiled += 1;
      entries.push({ file: name, skipped: false, compiled: true, reasons: [] });
      continue;
    }

    bailed += 1;
    const reasonList = [...reasons].sort();
    reasonList.forEach((reason) => histogram.set(reason, (histogram.get(reason) ?? 0) + 1));
    entries.push({ file: name, skipped: false, compiled: false, reasons: reasonList });
  }

  entries.sort((left, right) => left.file.localeCompare(right.file));
  const bails = [...histogram]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

  return {
    root,
    component,
    components: candidates,
    mode,
    files: files.length,
    candidates,
    compiled,
    bailed,
    skipped,
    bails,
    entries
  };
}

/** 人类可读的覆盖率摘要（CLI 默认输出）。 */
export function formatCoverage(report) {
  const share = (count) =>
    report.candidates === 0 ? '—' : `${Math.round((count / report.candidates) * 100)}%`;
  const lines = [
    `扫描 ${report.root}（按组件边界发现，模式 ${report.mode ?? '按用法推断'}）`,
    `  文件 ${report.files}：候选 ${report.candidates}（可编 ${report.compiled} / ${share(
      report.compiled
    )}，回落 ${report.bailed} / ${share(report.bailed)}），跳过 ${report.skipped}`
  ];

  if (report.bails.length > 0) {
    lines.push('  bail 原因（按命中文件数）');
    report.bails.forEach((item) => lines.push(`    ${item.count} × ${item.reason}`));
  }

  return lines.join('\n');
}

/**
 * 覆盖率基线（可提交、可 diff）：计数用于看趋势，**编译能力用逐文件集合兜底**。
 *
 * 为什么不只存计数：删掉一个可编文件、加两个可编文件，计数可以持平甚至变好，但能力其实退了。
 */
export function coverageBaselineOf(reports) {
  return {
    version: 1,
    targets: reports.map((report) => ({
      root: report.root,
      component: report.component,
      mode: report.mode,
      files: report.files,
      candidates: report.candidates,
      compiled: report.compiled,
      bailed: report.bailed,
      skipped: report.skipped,
      compiledFiles: report.entries.filter((entry) => entry.compiled).map((entry) => entry.file),
      bails: report.bails
    }))
  };
}

/**
 * 与基线比对：**只有「基线里可编、现在回落」算回退**。
 *
 * 新增可编形状、新增候选都不拦——覆盖率只许涨；基线里可编的文件一旦回落，
 * 那是编译器能力回退（或形状被改坏），拿得到原因才好定位。
 */
export function compareCoverageBaseline(baseline, reports) {
  const regressions = [];
  const added = [];

  reports.forEach((report) => {
    const base = baseline?.targets?.find(
      (target) =>
        target.root === report.root &&
        target.component === report.component &&
        target.mode === report.mode
    );
    if (!base) {
      return; // 新目标：没有基线可比，先记数（首轮 --write 建基线）
    }

    const compiled = new Set(
      report.entries.filter((entry) => entry.compiled).map((entry) => entry.file)
    );

    base.compiledFiles.forEach((file) => {
      if (compiled.has(file)) {
        return;
      }
      const entry = report.entries.find((item) => item.file === file);
      regressions.push({
        root: report.root,
        file,
        reason: entry ? entry.reasons.join(' | ') : '文件已不在扫描范围'
      });
    });

    compiled.forEach((file) => {
      if (!base.compiledFiles.includes(file)) {
        added.push({ root: report.root, file });
      }
    });
  });

  return { ok: regressions.length === 0, regressions, added };
}
