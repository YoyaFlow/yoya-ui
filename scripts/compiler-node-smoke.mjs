#!/usr/bin/env node
/**
 * 编译器包的 Node 兼容冒烟：在**当前 Node** 上验证「编译器核心 + `/rollup` 插件 + CLI」真的可用，
 * 并报告 unplugin 入口的状态。
 *
 *     npm run build:packages            # 先生成 packages/yoya-compiler/dist
 *     nvm use 18 && npm run smoke:compiler
 *     nvm use 20 && npm run smoke:compiler
 *     nvm use 22 && npm run smoke:compiler
 *
 * 为什么不用 vitest 跑：测试框架自己（vite 8 / vitest 4）要求 Node ≥ 20.19，没法在 18 上装起来；
 * 这份脚本只用 node 内置模块 + 包产物，所以能覆盖「编译器支持 Node 18.12+ 到最新版」这条声明。
 *
 * 退出码：0 = 全部通过（unplugin 入口不可用只算提示）；1 = 有硬失败。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const compilerDist = join(ROOT, 'packages', 'yoya-compiler', 'dist');

if (!existsSync(join(compilerDist, 'index.js'))) {
  console.error(`✗ 缺少 ${compilerDist}/index.js —— 先跑 \`npm run build:packages\``);
  process.exit(1);
}

const passed = [];
const failed = [];
const notes = [];

const step = async (name, run) => {
  try {
    const detail = await run();
    passed.push(`${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    failed.push(`${name} — ${error?.message ?? error}`);
  }
};

/** 环境相关的检查（unplugin 装没装、版本和 Node 搭不搭）只提示，不算失败。 */
const optionalStep = async (name, run) => {
  try {
    const detail = await run();
    passed.push(`${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const reason = String(error?.stderr || error?.message || error)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' / ');
    notes.push(`${name} 跳过：${reason}`);
  }
};

const workDir = mkdtempSync(join(tmpdir(), 'yoya-compiler-smoke-'));
const fixture = join(workDir, 'row.js');

const fixtureSource = [
  "import { table, tr, vText } from '@yoyaflow/yoya-core';",
  '',
  'export function BuildRow(item) {',
  '  return tr((line) => {',
  "    line.td((cell) => cell.className('col-md-1').child(String(item.data.id)));",
  "    line.td((cell) => cell.className('col-md-4').a((link) => link.child(vText(item.data.label))));",
  '  });',
  '}',
  '',
  'export function Demo(rows) {',
  '  return table((node) => node.tbody((body) => body.keyed(rows, BuildRow)));',
  '}',
  ''
].join('\n');

writeFileSync(fixture, fixtureSource, 'utf8');

console.log(`编译器 Node 冒烟 · node ${process.version} · ${process.platform}`);

await step('导入根入口（程序化 API）', async () => {
  const api = await import(pathToFileURL(join(compilerDist, 'index.js')).href);
  for (const name of ['compileSource', 'compileFile', 'reportCoverage', 'buildComponentRegistry']) {
    if (typeof api[name] !== 'function') {
      throw new Error(`缺导出 ${name}`);
    }
  }

  // 根入口不碰 unplugin：这里额外确认 index.js 没有静态 import 'unplugin'。
  const indexSource = readFileSync(join(compilerDist, 'index.js'), 'utf8');
  if (/(?:from|import)\s*['"]unplugin['"]/.test(indexSource)) {
    throw new Error('index.js 里出现了静态 unplugin import（老 Node 上会加载即崩）');
  }

  return `${Object.keys(api).length} 个导出`;
});

await step('/rollup 插件编译一份业务源码', async () => {
  const core = await import('@yoyaflow/yoya-core');
  const { yoyaCompileRollup } = await import(pathToFileURL(join(compilerDist, 'rollup.js')).href);
  const artifacts = [];
  const plugin = yoyaCompileRollup({
    core,
    registry: false,
    onArtifact: (name, source) => artifacts.push(source)
  });

  if (plugin?.name !== 'yoya-ui-compile') {
    throw new Error(`插件名不对：${plugin?.name}`);
  }

  const wired = await plugin.transform(fixtureSource, fixture);

  if (!wired?.code?.includes('BuildRowSource')) {
    throw new Error('改写后的代码里没有 BuildRowSource');
  }
  if (!artifacts.some((source) => source.includes('<td class='))) {
    throw new Error('虚拟产物模块里没有静态片段');
  }

  return `${wired.code.length} 字节改写 + ${artifacts.length} 个虚拟产物`;
});

await step('CLI：--help 与真编译', async () => {
  const bin = join(compilerDist, 'bin.js');
  const help = execFileSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });

  if (!help.includes('用法')) {
    throw new Error('--help 没有输出用法');
  }

  const out = join(workDir, 'generated', 'row.js');
  mkdirSync(join(workDir, 'generated'), { recursive: true });
  execFileSync(
    process.execPath,
    [bin, '--file', fixture, '--component', 'BuildRow', '--mode', 'element', '--out', out],
    { encoding: 'utf8' }
  );

  if (!existsSync(out)) {
    throw new Error('CLI 没有产出文件');
  }

  return `${readFileSync(out, 'utf8').length} 字节产物`;
});

// unplugin 入口（多打包器）在子进程里探测：老 Node + unplugin 3 会在这里炸，但不该影响上面三项。
await optionalStep('unplugin 入口（多打包器）', async () => {
  const probe = [
    `const api = await import(${JSON.stringify(pathToFileURL(join(compilerDist, 'index.js')).href)});`,
    `const core = await import('@yoyaflow/yoya-core');`,
    'const vite = api.yoyaCompile.vite({ core });',
    "if (vite.name !== 'yoya-ui-compile') throw new Error('unplugin 入口异常');",
    "console.log('ok');"
  ].join('\n');

  const output = execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (!output.includes('ok')) {
    throw new Error('unplugin 入口没跑通');
  }

  return 'yoyaCompile.vite() 可用';
});

rmSync(workDir, { recursive: true, force: true });

for (const line of passed) {
  console.log(`  ✓ ${line}`);
}
for (const line of notes) {
  console.log(`  · ${line}`);
}
for (const line of failed) {
  console.log(`  ✗ ${line}`);
}

console.log('');
if (failed.length > 0) {
  console.log(`compiler-node-smoke: ${failed.length} 项不通过`);
  process.exitCode = 1;
} else {
  console.log('compiler-node-smoke: 全部通过');
}
