export { ElementNode } from './element-node.js';
export { SVG_NAMESPACE, SvgElementNode } from './svg-element-node.js';
export { createElementFactory, createHtmlFactories, registerChildFactories } from './factory.js';
export { I18n, I18nTextNode, createI18n, i18n, i18nText, installI18nStringShortcut } from './i18n.js';
export {
  TextNode,
  VTextNode,
  ViewNode,
  ViewTextNode,
  escapeHtml,
  normalizeChild,
  resolveTarget,
  text,
  vText
} from './view-node.js';
