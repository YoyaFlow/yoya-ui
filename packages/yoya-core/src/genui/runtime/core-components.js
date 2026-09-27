/**
 * core 命名空间条目：裸 HTML 标签 + SVG 工厂（**组件无关**——只从 yoya-core 自己的模块派生）。
 *
 * 安全黑名单与 kitgen 的 manifest 口径一致（script / iframe 这类生成方不该拿到的标签不登记）。
 * 布局工厂（hstack / vstack …）属于组件库，随各库的插件注册，不在这里。
 */
import * as htmlModule from '../../html/index.js';
import * as svgModule from '../../svg/index.js';

const BLOCKED_HTML = new Set([
  'HtmlElementNode',
  'createHtmlFactories',
  'script',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'styleTag',
  'template',
  'title',
  'head',
  'html',
  'body',
  'noscript',
  'slot',
  'canvas'
]);
const BLOCKED_SVG = new Set(['svgs', 'SvgElementNode', 'SVG_NAMESPACE']);

function buildCoreComponents() {
  const entries = {};

  // SVG 容器（svg）+ 子标签工厂（circle / path / defs …，收在 svgs 子对象里）；
  // 与 HTML 同名的（a / text …）保留 HTML 语义——HTML 后写覆盖。
  Object.entries(svgModule)
    .filter(([name, value]) => typeof value === 'function' && !BLOCKED_SVG.has(name))
    .forEach(([name, factory]) => {
      entries[name] = { factory, kind: 'element' };
    });

  Object.entries(svgModule.svgs ?? {})
    .filter(([, value]) => typeof value === 'function')
    .forEach(([name, factory]) => {
      entries[name] = { factory, kind: 'element' };
    });

  Object.entries(htmlModule)
    .filter(([tag, value]) => typeof value === 'function' && !BLOCKED_HTML.has(tag))
    .forEach(([tag, factory]) => {
      entries[tag] = { factory, kind: 'element' };
    });

  return entries;
}

export const coreComponents = Object.freeze(buildCoreComponents());
