// 基准报告 CLI（核心库报告 + UI 库报告）：
//   node scripts/bench-report.mjs            打印将生成的核心库报告（不写文件）
//   node scripts/bench-report.mjs --write    按结果 JSON 生成四份文档（各中英一份）
//   node scripts/bench-report.mjs --check    门禁：报告文档与结果 JSON 不一致即失败
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  compareBenchDocs,
  formatCoreReport,
  formatUiReport,
  readBenchResults
} from './bench-metrics.mjs';
import { readReadmeSizes } from './bundle-metrics.mjs';

const root = resolve(import.meta.dirname, '..');
const mode = process.argv[2];

const results = readBenchResults();
if (!results.core) {
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
  const docs = [...(await formatCoreReport({ core: results.core, sizes }))];
  if (results.ui) {
    docs.push(...(await formatUiReport({ sizes, ui: results.ui })));
  } else {
    console.warn(
      '未找到 benchmarks/results/ui.json：跳过 UI 库报告（npm run bench:jfb:ui 可产出）'
    );
  }

  if (mode === '--write') {
    docs.forEach(({ content, file }) => {
      writeFileSync(file, content, 'utf8');
      console.log(`已写入 ${file.replace(`${root}\\`, '').replace(`${root}/`, '')}`);
    });
  } else if (mode === '--check') {
    const mismatches = await compareBenchDocs({
      core: results.core,
      sizes,
      ui: results.ui ?? null
    });
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
