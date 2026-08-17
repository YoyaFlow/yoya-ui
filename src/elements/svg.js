import { ElementNode } from '../core/element-node.js';
import { registerChildFactories } from '../core/factory.js';
import { SvgElementNode } from '../core/svg-element-node.js';

// SVG 子元素只注册到 SvgElementNode 上，避免污染 HTML 父节点和公共导出。
const svgChildElementDefinitions = [
  'animate',
  'animateMotion',
  'animateTransform',
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'set',
  'stop',
  { name: 'svgA', tagName: 'a' },
  { name: 'svgScript', tagName: 'script' },
  { name: 'svgStyle', tagName: 'style' },
  { name: 'svgSwitch', tagName: 'switch' },
  { name: 'svgText', tagName: 'text' },
  { name: 'svgTitle', tagName: 'title' },
  'symbol',
  'textPath',
  'tspan',
  'use',
  'view'
];

/**
 * 为 SVG 标签创建工厂函数。
 */
function createSvgElementFactory(tagName) {
  return function svgElementFactory(setup = null) {
    return new SvgElementNode(tagName, setup);
  };
}

/**
 * 生成 SVG 工厂集合。
 */
function createSvgFactories() {
  return svgChildElementDefinitions.reduce((factories, definition) => {
    const { aliases = [], name, tagName } = normalizeSvgElementDefinition(definition);
    const factory = createSvgElementFactory(tagName);

    factories[name] = factory;
    aliases.forEach((alias) => {
      factories[alias] = factory;
    });

    return factories;
  }, {});
}

/**
 * 只有 <svg> 是 HTML DSL 可见入口；SVG 子标签必须通过 svg 节点内部方法添加。
 */
export const svg = createSvgElementFactory('svg');
const svgChildFactories = createSvgFactories();

registerChildFactories(ElementNode, { svg });
registerChildFactories(SvgElementNode, { svg, ...svgChildFactories });

function normalizeSvgElementDefinition(definition) {
  if (typeof definition === 'string') {
    return {
      name: definition,
      tagName: definition
    };
  }

  return definition;
}
