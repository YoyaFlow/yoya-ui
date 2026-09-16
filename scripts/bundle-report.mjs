// 产物体积报表 CLI。体积口径与 README 表口径都在 bundle-metrics.mjs，
// README 表与产物是否一致由 verify:dist 把关。
//
//   node scripts/bundle-report.mjs           打印体积表（npm run build 末尾自动执行，CI 日志可见）
//   node scripts/bundle-report.mjs --write   按当前产物刷新 README 中英体积表的数字并格式化
import { readFileSync, writeFileSync } from 'node:fs';
import { collectBundleReport, formatBundleReport, patchReadmeSizes } from './bundle-metrics.mjs';

const READMES = ['README.md', 'README.zh-CN.md'];

const report = await collectBundleReport();
const mode = process.argv[2];

if (mode === '--write') {
  for (const file of READMES) {
    const text = readFileSync(file, 'utf8');
    const next = patchReadmeSizes(text, report);
    if (next === text) {
      console.log(`${file}: 体积表已是最新`);
      continue;
    }
    // 用项目 prettier 配置格式化：表格列宽变了要重新对齐，否则 format:check 会失败。
    const prettier = await import('prettier');
    const options = await prettier.resolveConfig(file);
    writeFileSync(file, await prettier.format(next, { ...options, filepath: file }), 'utf8');
    console.log(`${file}: 体积表已按当前产物刷新`);
  }
} else if (mode) {
  console.error(`未知参数 ${mode}；唯一可用参数：--write`);
  process.exitCode = 1;
} else {
  console.log(formatBundleReport(report));
}
