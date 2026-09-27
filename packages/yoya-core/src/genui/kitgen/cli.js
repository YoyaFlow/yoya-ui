#!/usr/bin/env node
/**
 * genui-kitgen —— 组件库 manifest 生成 CLI。
 *
 * 用法（在组件库仓库里）：
 *   genui-kitgen                      # 找 kitgen.config.{js,mjs,json}，生成并写盘
 *   genui-kitgen --config my.config.js
 *   genui-kitgen --out dist/genui-kit.json
 *   genui-kitgen --check              # 只比对不写盘；不一致退出码 1（CI 门禁）
 */
import { readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfigFile, writeKit } from './index.js';

const args = process.argv.slice(2);

const readFlag = (name) => {
  const index = args.indexOf(name);

  return index >= 0 ? args[index + 1] : undefined;
};

const hasFlag = (name) => args.includes(name);

async function discoverConfig() {
  const entries = await readdir(process.cwd(), { withFileTypes: true });
  const names = ['kitgen.config.js', 'kitgen.config.mjs', 'kitgen.config.json'];

  return (
    names.find((name) => entries.some((entry) => entry.isFile() && entry.name === name)) ?? null
  );
}

const configArg = readFlag('--config');
const configFile = configArg ?? (await discoverConfig());

if (!configFile) {
  console.error(
    '找不到 kitgen.config.js / .mjs / .json（可用 --config 指定）。配置说明见 kitgen/README.md。'
  );
  process.exit(1);
}

const { config } = await loadConfigFile(configFile);
const result = await writeKit(config, {
  resolveFrom: dirname(fileURLToPath(pathToFileURL(configFile))),
  out: readFlag('--out'),
  check: hasFlag('--check')
});

if (result.checked) {
  for (const output of result.outputs) {
    if (output.changed) {
      console.error(`✗ ${output.out} 与源码不一致——重跑生成并提交（或修 JSDoc 后重生成）。`);
      process.exit(1);
    }
  }

  console.log(`✓ ${result.outputs.length} 个产物与源码一致（无需重新生成）`);
  process.exit(0);
}

const { components, documented, htmlElements, pluginGenerated, svgFactories, version } =
  result.summary;

console.log(`产物 1：manifest → ${result.outputs[0].out}`);
console.log(`  工厂组件：${components}（JSDoc 文档 ${documented}，其余 needsDocs）`);
console.log(`  HTML 元素：${htmlElements} · SVG 工厂：${svgFactories}`);
console.log(`  版本钉：${version}`);

if (pluginGenerated) {
  console.log(`产物 2：插件 → ${result.outputs[1].out}（createPlugin + 接线表）`);
}
