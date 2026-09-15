// 产物查看表格：列出 dist 的入口与公共 chunk 体积。
// 增量入口给两列——「入口文件本身」与「实际下载量（入口 + 它引用的公共 chunk）」，
// 只报入口文件会让人误以为 core 只有几 KB。
// 用法：npm run report:bundle（在 npm run build 之后执行）
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const dist = 'dist';
const kb = (bytes) => (bytes / 1024).toFixed(1);
const minName = (name) => name.replace(/\.js$/, '.min.js');

// 入口 + 传递依赖：直接让 bundler 跟着 dist 的 import 图重打一次，得到真实下载量
async function downloadSize(entry) {
  const build = await rolldown({ input: { entry: join(dist, entry) } });
  const { output } = await build.generate({ format: 'es', minify: true });
  const code = output.map((chunk) => chunk.code).join('\n');

  return { raw: code.length, gzip: gzipSync(code).length };
}

function fileSize(file) {
  const raw = statSync(join(dist, file)).size;
  const min = existsSync(join(dist, minName(file)))
    ? statSync(join(dist, minName(file))).size
    : raw;
  const gzip = gzipSync(
    readFileSync(join(dist, existsSync(join(dist, minName(file))) ? minName(file) : file))
  ).length;

  return { raw, min, gzip };
}

const INCREMENTAL = [
  'yoya.core.js',
  'yoya.ui.js',
  'yoya.router.js',
  'yoya.devtools.js',
  'yoya.echart.js',
  'yoya.three.js'
];

// 每个入口包含什么——只看体积数字没人知道 core 里有 i18n。
const CONTENTS = {
  'yoya.core.js':
    '节点引擎（ViewNode / ElementNode / 工厂）、全部 HTML 标签工厂、SVG 工厂与内置图标集、Signals（ref / computed / batch）、i18n、权限 access、context、a11y、theme helper、ClientOnly',
  'yoya.ui.js':
    '全部组件：layout / actions / navigation / feedback / form / data-display / async / effects + 语言切换组件 + theme',
  'yoya.router.js':
    'router（createRouter / vRouter / vLink / vRouterViews）+ SSR 原语（renderToString / renderPage / hydrate / hydrateOrMount / mount / serializeState / parseState）',
  'yoya.devtools.js':
    'enableDevtools / disableDevtools / subscribeDevtools / getDevtoolsSnapshot / getDevtoolsDom / getDevtoolsScope',
  'yoya.echart.js': 'vEchart（ECharts 封装）',
  'yoya.three.js': 'vThree（Three.js 封装）',
  'yoya.router.full.js': 'core + router / SSR（自包含）',
  'yoya.ui.full.js': 'core + 全部组件（自包含）',
  'yoya.ui-router.full.js': 'core + 全部组件 + router / SSR（自包含，全量）'
};
const FULL = readdirSync(dist)
  .filter((name) => /^yoya\.[\w-]+\.full\.js$/.test(name))
  .sort();
const CHUNKS = readdirSync(dist)
  .filter((name) => /^(?!yoya\.)[\w-]+\.js$/.test(name) && !name.endsWith('.min.js'))
  .sort();

const lines = [];

lines.push('### 增量入口（ESM，不含 core）\n');
lines.push('| 入口 | 入口文件 min+gzip | 实际下载量 min+gzip | 包含内容 |');
lines.push('| --- | --- | --- | --- |');
for (const entry of INCREMENTAL) {
  const own = fileSize(entry);
  const full = await downloadSize(entry);
  lines.push(`| \`${entry}\` | ${kb(own.gzip)} KB | ${kb(full.gzip)} KB | ${CONTENTS[entry]} |`);
}

lines.push('\n### 自包含入口（ESM，core 已内联）\n');
lines.push('| 产物 | raw | min | min+gzip | 包含内容 |');
lines.push('| --- | --- | --- | --- | --- |');
for (const file of FULL) {
  const size = fileSize(file);
  lines.push(
    `| \`${file}\` | ${kb(size.raw)} KB | ${kb(size.min)} KB | ${kb(size.gzip)} KB | ${CONTENTS[file] ?? ''} |`
  );
}

lines.push('\n### 公共 chunk（内部命名，被增量入口自动引用）\n');
lines.push('| chunk | raw | min | min+gzip |');
lines.push('| --- | --- | --- | --- |');
for (const file of CHUNKS) {
  const size = fileSize(file);
  lines.push(`| \`${file}\` | ${kb(size.raw)} KB | ${kb(size.min)} KB | ${kb(size.gzip)} KB |`);
}

const css = join(dist, 'yoya.ui.css');
if (existsSync(css)) {
  lines.push(
    `\n组件皮肤：\`yoya.ui.css\` ${kb(statSync(css).size)} KB raw / ${kb(gzipSync(readFileSync(css)).length)} KB gzip（core 层无皮肤）`
  );
}

console.log(lines.join('\n'));
