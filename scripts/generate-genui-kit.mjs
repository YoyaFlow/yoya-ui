/**
 * 生成 genui-kit.json——yoya-ui 的 Tier1 GenUI manifest。
 *
 * 纪律（由 2026-09-27 的漂移事故确立）：
 * 1. 工厂清单从源码扫描派生，绝不手写（手写 = 必然漂移）；
 * 2. HTML/SVG 元素从模块导出派生 + 安全黑名单（导出存在 ≠ 对模型开放）；
 * 3. 精选文档（genui-kit.docs.json）由组件作者维护，与实现同 PR 修改；
 * 4. 未文档化工厂如实标 needsDocs——manifest 与运行时同真，不装懂。
 *
 * 用法：node scripts/generate-genui-kit.mjs（在 yoya-ui 仓库根执行）
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UI_SRC = join(ROOT, 'packages/yoya-ui/src');
const DOCS_FILE = join(ROOT, 'packages/yoya-ui/genui-kit.docs.json');
const OUT_FILE = join(ROOT, 'packages/yoya-ui/genui-kit.json');

const CATEGORY_MAP = {
  actions: 'actions', form: 'form', 'data-display': 'data-display',
  feedback: 'feedback', navigation: 'navigation', layout: 'layout',
  components: 'basic', chart: 'media', async: 'feedback', effects: 'feedback',
  i18n: 'basic', theme: 'basic', router: 'navigation', three: 'media', testing: null,
};

// 安全黑名单：导出存在 ≠ 应对模型开放（可执行内容/文档结构向量/非工厂）
const BLOCKED_HTML = new Set([
  'HtmlElementNode', 'createHtmlFactories', 'script', 'iframe', 'object', 'embed',
  'base', 'link', 'meta', 'styleTag', 'template', 'title', 'head', 'html', 'body',
  'noscript', 'slot', 'canvas',
]);
const BLOCKED_SVG = new Set(['svgs', 'SvgElementNode', 'SVG_NAMESPACE']);

async function scanFactories() {
  const found = new Map(); // name -> { category }
  const categories = (await readdir(UI_SRC, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && CATEGORY_MAP[d.name] !== null)
    .map((d) => d.name);
  for (const category of categories) {
    const dir = join(UI_SRC, category);
    const files = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
    for (const entry of files) {
      if (!entry.isFile() || !entry.name.endsWith('.js') || entry.name.includes('.test.')) continue;
      const source = await readFile(join(entry.path, entry.name), 'utf8');
      // 工厂模式：export function VXxx( / export const vXxx = createComponentShortcut /
      //          layout 签名 export function lower(first = null, second = null, third = null)
      for (const match of source.matchAll(/export function (v[A-Z]\w*)\(/g)) {
        found.set(match[1], { category: CATEGORY_MAP[category] });
      }
      for (const match of source.matchAll(/export const (v[A-Z]\w*) = createComponentShortcut/g)) {
        found.set(match[1], { category: CATEGORY_MAP[category] });
      }
      if (category === 'layout') {
        for (const match of source.matchAll(/export function ([a-z]\w*)\(first = null, second = null, third = null\)/g)) {
          found.set(match[1], { category: 'layout' });
        }
      }
    }
  }
  return found;
}

function deriveElements(factories, blocked) {
  return Object.entries(factories)
    .filter(([name, value]) => typeof value === 'function' && !blocked.has(name))
    .map(([name]) => name)
    .sort();
}

const pkg = JSON.parse(await readFile(join(ROOT, 'packages/yoya-ui/package.json'), 'utf8'));
const docs = JSON.parse(await readFile(DOCS_FILE, 'utf8'));
const curated = new Map(docs.components.map((c) => [c.name, c]));

const factories = await scanFactories();
const htmlMod = await import('@yoyaflow/yoya-core/html');
const svgMod = await import('@yoyaflow/yoya-core/svg');

const components = [...factories.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, { category }]) => {
    const doc = curated.get(name);
    return {
      name,
      factory: true,
      category: doc?.category ?? category ?? 'basic',
      scenes: doc?.scenes ?? [],
      ...(doc
        ? {
            summary: doc.summary,
            dataContract: doc.dataContract,
            whenToUse: doc.whenToUse,
            notFor: doc.notFor,
            props: doc.props,
            example: doc.example,
            pitfalls: doc.pitfalls,
          }
        : { summary: '', needsDocs: true }),
    };
  });

const manifest = {
  $schema: 'genui-kit/1',
  namespace: 'yoyaflow/yoya-ui',
  version: pkg.version,
  runtime: { genui: '>=0.1 <0.2' },
  generated: { from: 'source-scan + curated docs', notice: '工厂清单勿手改——重跑 scripts/generate-genui-kit.mjs' },
  components,
  htmlElements: deriveElements(htmlMod, BLOCKED_HTML),
  svgFactories: deriveElements(svgMod, BLOCKED_SVG),
};

await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n');
const needsDocs = components.filter((c) => c.needsDocs).length;
console.log(`genui-kit.json 生成完毕：`);
console.log(`  工厂组件：${components.length}（精选文档 ${components.length - needsDocs} / 待文档 needsDocs=${needsDocs}）`);
console.log(`  HTML 元素：${manifest.htmlElements.length}`);
console.log(`  SVG 工厂：${manifest.svgFactories.length}`);
console.log(`  版本钉：${pkg.version}`);
