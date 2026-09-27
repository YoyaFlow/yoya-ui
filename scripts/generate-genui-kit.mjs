/**
 * 生成 genui-kit.json——yoya-ui 的 Tier1 GenUI manifest。
 *
 * 单一文档面纪律（2026-09-27 收敛）：组件文档只存在于**源码 JSDoc**（@genui* 标签），
 * 无独立文档文件。生成器从源码派生一切：
 * 1. 工厂清单：扫描导出（绝不手写）；
 * 2. 选型/用法文档：紧邻导出的 @genui* JSDoc 标签；
 * 3. props：解析 PascalCase 工厂函数签名的解构参数（零手写）；
 * 4. HTML/SVG 元素：模块导出派生 + 安全黑名单；
 * 5. 未标注工厂如实 needsDocs——manifest 与运行时同真。
 *
 * 用法：npm run kit:generate（在 yoya-ui 仓库根执行）
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UI_SRC = join(ROOT, 'packages/yoya-ui/src');
const OUT_FILE = join(ROOT, 'packages/yoya-ui/genui-kit.json');

const CATEGORY_MAP = {
  actions: 'actions', form: 'form', 'data-display': 'data-display',
  feedback: 'feedback', navigation: 'navigation', layout: 'layout',
  components: 'basic', chart: 'media', async: 'feedback', effects: 'feedback',
  i18n: 'basic', theme: 'basic', router: 'navigation', three: 'media', testing: null,
};

const BLOCKED_HTML = new Set([
  'HtmlElementNode', 'createHtmlFactories', 'script', 'iframe', 'object', 'embed',
  'base', 'link', 'meta', 'styleTag', 'template', 'title', 'head', 'html', 'body',
  'noscript', 'slot', 'canvas',
]);
const BLOCKED_SVG = new Set(['svgs', 'SvgElementNode', 'SVG_NAMESPACE']);

/** 从源码文本提取紧邻某位置之前的 JSDoc @genui 块 */
function extractGenuiDoc(source, index) {
  const before = source.slice(0, index).trimEnd();
  if (!before.endsWith('*/')) return null;
  const start = before.lastIndexOf('/**');
  if (start < 0) return null;
  const block = before.slice(start);
  if (!/@genui\s/.test(block)) return null;
  const doc = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*\*\s*@genui(?:\.(\w+))?\s+(.*)$/);
    if (!m) continue;
    const [, tag = 'summary', value] = m;
    const key = { summary: 'summary', contract: 'dataContract', use: 'whenToUse', notFor: 'notFor', pitfall: 'pitfalls', example: 'example' }[tag];
    if (!key) continue;
    doc[key] = key === 'whenToUse' || key === 'notFor' || key === 'pitfalls'
      ? value.split('；').map((s) => s.trim()).filter(Boolean)
      : key === 'example'
        ? JSON.parse(value)
        : value;
  }
  return Object.keys(doc).length > 0 ? doc : null;
}

/** 解析 PascalCase 工厂签名解构参数 → props 名列表（零手写 props） */
function extractProps(source, factoryName) {
  const re = new RegExp(`export function ${factoryName}\\(\\{([^}]*)\\}`);
  const m = source.match(re);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((part) => part.split('=')[0].split(':')[0].trim())
    .filter((name) => /^[a-zA-Z_$][\w$]*$/.test(name) && name !== '...')
    .filter((name) => !name.startsWith('...'))
    .map((name) => ({ [name]: '' }))
    .reduce((acc, item) => ({ ...acc, ...item }), {});
}

async function scanFactories() {
  const found = new Map(); // name -> { category, file, source, index }
  const propSignatures = new Map(); // PascalCase 名 -> props（同文件内）
  const categories = (await readdir(UI_SRC, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && CATEGORY_MAP[d.name] !== null)
    .map((d) => d.name);
  for (const category of categories) {
    const dir = join(UI_SRC, category);
    const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.includes('.test.')) continue;
      const file = join(entry.path, entry.name);
      const source = await readFile(file, 'utf8');
      // PascalCase 工厂签名 → props 表（供同名 v 快捷方式引用）
      for (const match of source.matchAll(/export function (V[A-Z]\w*)\(\{([^}]*)\}/g)) {
        const props = extractProps(source, match[1]);
        if (props) propSignatures.set(match[1], props);
      }
      for (const match of source.matchAll(/export (function (v[A-Z]\w*)\(|const (v[A-Z]\w*) = createComponentShortcut)/g)) {
        const name = match[2] ?? match[3];
        found.set(name, { category: CATEGORY_MAP[category], source, index: match.index });
      }
      if (category === 'layout') {
        for (const match of source.matchAll(/export function ([a-z]\w*)\(first = null, second = null, third = null\)/g)) {
          found.set(match[1], { category: 'layout', source, index: match.index });
        }
      }
    }
  }
  return { found, propSignatures };
}

function deriveElements(factories, blocked) {
  return Object.entries(factories)
    .filter(([name, value]) => typeof value === 'function' && !blocked.has(name))
    .map(([name]) => name)
    .sort();
}

const pkg = JSON.parse(await readFile(join(ROOT, 'packages/yoya-ui/package.json'), 'utf8'));
const { found, propSignatures } = await scanFactories();
const htmlMod = await import('@yoyaflow/yoya-core/html');
const svgMod = await import('@yoyaflow/yoya-core/svg');

const components = [...found.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, meta]) => {
    const doc = extractGenuiDoc(meta.source, meta.index);
    const pascal = 'V' + name.slice(1);
    const props = propSignatures.get(pascal) ?? doc?.props ?? null;
    return {
      name,
      factory: true,
      category: doc?.category ?? meta.category ?? 'basic',
      scenes: doc?.scenes ?? [],
      ...(doc
        ? { ...doc, ...(props ? { props } : {}), needsDocs: false }
        : { summary: '', ...(props ? { props } : {}), needsDocs: true }),
    };
  });

const manifest = {
  $schema: 'genui-kit/1',
  namespace: 'yoyaflow/yoya-ui',
  version: pkg.version,
  runtime: { genui: '>=0.1 <0.2' },
  generated: { from: 'source-scan + JSDoc @genui tags', notice: '工厂清单勿手改——重跑 scripts/generate-genui-kit.mjs；文档写在组件源码 JSDoc（@genui* 标签）' },
  components,
  htmlElements: deriveElements(htmlMod, BLOCKED_HTML),
  svgFactories: deriveElements(svgMod, BLOCKED_SVG),
};

await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n');
const documented = components.filter((c) => !c.neeedsDocs && c.summary).length;
const withProps = components.filter((c) => c.props && Object.keys(c.props).length > 0).length;
console.log(`genui-kit.json 生成完毕：`);
console.log(`  工厂组件：${components.length}（JSDoc 文档 ${documented} / props 自动抽取 ${withProps} / 其余 needsDocs）`);
console.log(`  HTML 元素：${manifest.htmlElements.length} · SVG 工厂：${manifest.svgFactories.length}`);
console.log(`  版本钉：${pkg.version}`);
