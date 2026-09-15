// 产物查看表格：列出 dist 里对外发布的入口与公共 chunk，给出 raw / min / min+gzip。
// 用法：npm run report:bundle（在 npm run build 之后执行）
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = 'dist';
const kb = (bytes) => (bytes / 1024).toFixed(1);

const ENTRY_GROUPS = [
  {
    title: '增量入口（ESM）',
    match:
      /^yoya\.(core|ui|actions|navigation|feedback|form|data-display|async|router|echart|three|devtools)\.js$/
  },
  { title: '自包含入口（ESM，core 已内联）', match: /^yoya\.[\w-]+\.full\.js$/ },
  { title: '公共 chunk（内部命名）', match: /^(?!yoya\.)[\w-]+\.js$/ }
];

function rowsOf(match) {
  return readdirSync(dist)
    .filter((name) => match.test(name) && !name.endsWith('.min.js'))
    .sort()
    .map((name) => {
      const raw = statSync(join(dist, name)).size;
      const minName = name.replace(/\.js$/, '.min.js');
      const hasMin = existsSync(join(dist, minName));
      const min = hasMin ? statSync(join(dist, minName)).size : raw;
      const gzip = gzipSync(readFileSync(join(dist, hasMin ? minName : name))).length;

      return { name, raw, min, gzip };
    });
}

const lines = ['| 产物 | raw | min | min+gzip |', '| --- | --- | --- | --- |'];

ENTRY_GROUPS.forEach((group) => {
  const rows = rowsOf(group.match);
  if (rows.length === 0) {
    return;
  }

  lines.push(`| **${group.title}** | | | |`);
  rows.forEach((row) => {
    lines.push(`| \`${row.name}\` | ${kb(row.raw)} KB | ${kb(row.min)} KB | ${kb(row.gzip)} KB |`);
  });
});

const css = join(dist, 'yoya.ui.css');
if (existsSync(css)) {
  lines.push(
    `| \`yoya.ui.css\` | ${kb(statSync(css).size)} KB | — | ${kb(gzipSync(readFileSync(css)).length)} KB |`
  );
}

console.log(lines.join('\n'));
