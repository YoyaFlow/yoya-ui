// 核心基准报告 CLI：
//   node scripts/bench-report.mjs            打印将生成的报告（不写文件）
//   node scripts/bench-report.mjs --write    按结果 JSON 生成中英报告文档
//   node scripts/bench-report.mjs --check    门禁：报告文档与结果 JSON 不一致即失败
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compareBenchDocs, formatBenchReport, readBenchResults } from './bench-metrics.mjs';
import { readReadmeSizes } from './bundle-metrics.mjs';

const root = resolve(import.meta.dirname, '..');
const mode = process.argv[2];

const results = readBenchResults();
if (!results.baseline) {
  console.error(
    '缺少 benchmarks/results/baseline.json：先运行 npm run bench:jfb -- --write-baseline'
  );
  process.exitCode = 1;
} else {
  const readmeSizes = readReadmeSizes(readFileSync(resolve(root, 'README.md'), 'utf8'));
  const sizes = {
    core: readmeSizes.rows['yoya.core.js 入口文件 ~ 实际下载量']?.[1],
    full: readmeSizes.rows['yoya.ui-router.full.js raw / min / min+gzip']?.[2],
    ui: readmeSizes.rows['yoya.ui.js 入口文件 ~ 实际下载量']?.[1]
  };
  const docs = await formatBenchReport({ ...results, sizes });

  if (mode === '--write') {
    docs.forEach(({ content, file }) => {
      writeFileSync(file, content, 'utf8');
      console.log(`已写入 ${file.replace(`${root}\\`, '').replace(`${root}/`, '')}`);
    });
  } else if (mode === '--check') {
    const mismatches = await compareBenchDocs({ ...results, sizes });
    if (mismatches.length > 0) {
      console.error('基准报告与结果 JSON 不一致：');
      mismatches.forEach((message) => console.error(`  ${message}`));
      console.error('\n提示：npm run bench:jfb:report 可重新生成报告文档。');
      process.exitCode = 1;
    } else {
      console.log('基准报告与结果 JSON 一致。');
    }
  } else {
    console.log(docs[0].content);
  }
}
