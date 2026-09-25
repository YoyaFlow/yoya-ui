// 编译覆盖度基线（覆盖度缺口 4）：`--report` 的扫描结果进构建日志，并对基线禁回退。
//
//   node scripts/compiler-coverage.mjs           打印覆盖率 + bail 直方图，与基线比对（回退即失败）
//   node scripts/compiler-coverage.mjs --write   按当前扫描刷新 scripts/compiler-coverage.baseline.json
//
// 口径：逐文件的「可编」集合（`coverageBaselineOf`）。新增候选 / 新增可编形状都不拦，
// 基线里编得出来的文件一旦回落就失败——那是**编译器能力回退**，不是数字波动。
// `npm run build` 末尾会跑本脚本（与体积表同一位置），所以 CI 日志里能直接看到覆盖率。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import * as core from '@yoyaflow/yoya-core';
import {
  compareCoverageBaseline,
  coverageBaselineOf,
  formatCoverage,
  reportCoverage
} from '../packages/yoya-compiler/src/report.js';

const root = resolve(import.meta.dirname, '..');
const baselineFile = resolve(root, 'scripts/compiler-coverage.baseline.json');

/** 扫描目标：库源码与示例各留一条基线（相对路径写进基线，换机器还能比）。 */
const TARGETS = ['packages', 'examples'];

const mode = process.argv[2];
if (mode && mode !== '--write') {
  console.error(`未知参数 ${mode}；唯一可用参数：--write`);
  process.exitCode = 1;
} else {
  const reports = TARGETS.map((target) => reportCoverage({ root: target, core, mode: 'element' }));
  reports.forEach((report) => console.log(formatCoverage(report)));

  if (mode === '--write') {
    writeFileSync(
      baselineFile,
      `${JSON.stringify(coverageBaselineOf(reports), null, 2)}\n`,
      'utf8'
    );
    console.log(`编译覆盖度基线已刷新：${relative(root, baselineFile).replaceAll('\\', '/')}`);
  } else if (!existsSync(baselineFile)) {
    console.log('编译覆盖度基线：不存在（`npm run report:compile:write` 生成一次并提交）');
  } else {
    const comparison = compareCoverageBaseline(
      JSON.parse(readFileSync(baselineFile, 'utf8')),
      reports
    );

    comparison.added.forEach((item) =>
      console.log(`编译覆盖度新增可编：${item.root} / ${item.file}`)
    );

    if (comparison.ok) {
      console.log('编译覆盖度基线：无回退');
    } else {
      comparison.regressions.forEach((item) =>
        console.error(`编译覆盖度回退：${item.root} / ${item.file} —— ${item.reason}`)
      );
      console.error(
        '（确认是有意为之就 `npm run report:compile:write` 刷新基线，并在提交信息里写清为什么）'
      );
      process.exitCode = 1;
    }
  }
}
