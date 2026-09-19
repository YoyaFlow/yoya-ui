/**
 * 覆盖率扫描：对一个目录里的候选文件逐个试编，输出「可编 / 回落」占比与 bail 原因直方图。
 *
 * 用途是**取舍依据**：先看清一个代码库里哪些形状能编、卡在哪些构造上，再决定给哪些
 * 组件写编译路径；扫描本身不改任何源码。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { compileSource, elementWhitelistOf } from './compile.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.scratch', '.cache']);

/** 文件里没有定义目标函数（只是提到了名字）——按跳过计，不算候选形状。 */
const isMissingTarget = (result, fn) =>
  result.bails.length === 1 && result.bails[0].reason === `找不到目标函数 ${fn}`;

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
 * @param {string} [options.fn] 候选构建函数名（不含它的文件记为 skipped）
 * @param {'element'|'node'} [options.mode] 产物通道
 * @param {object} options.core 核心入口命名空间
 * @param {string[]} [options.extensions] 参与扫描的扩展名
 */
export function reportCoverage(options) {
  const {
    root,
    fn = 'buildRow',
    mode = 'element',
    thin = false,
    core,
    whitelist,
    runtime,
    extensions = ['.js', '.mjs']
  } = options;

  const registry = whitelist ?? elementWhitelistOf(core);
  const files = walk(root, extensions);
  const marker = new RegExp(`\\b${fn}\\b`);
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

    if (!marker.test(source)) {
      skipped += 1;
      entries.push({ file: name, skipped: true, compiled: false, reasons: [] });
      continue;
    }

    candidates += 1;
    const result = compileSource({
      source,
      file: name,
      fn,
      mode,
      thin,
      core,
      whitelist: registry,
      runtime
    });

    if (result.compiled) {
      compiled += 1;
      entries.push({ file: name, skipped: false, compiled: true, reasons: [] });
      continue;
    }

    // 只是「提到了这个名字」（注释、字符串、测试）而没有定义目标函数：不算候选形状
    if (isMissingTarget(result, fn)) {
      candidates -= 1;
      skipped += 1;
      entries.push({ file: name, skipped: true, compiled: false, reasons: [] });
      continue;
    }

    bailed += 1;
    const reasons = [...new Set(result.bails.map((bail) => bail.reason))].sort();
    reasons.forEach((reason) => histogram.set(reason, (histogram.get(reason) ?? 0) + 1));
    entries.push({ file: name, skipped: false, compiled: false, reasons });
  }

  entries.sort((left, right) => left.file.localeCompare(right.file));
  const bails = [...histogram]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));

  return {
    root,
    fn,
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
    `扫描 ${report.root}（函数 ${report.fn}，模式 ${report.mode}）`,
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
