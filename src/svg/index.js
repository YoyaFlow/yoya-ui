import { ElementNode, registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const svgTextContentHosts = new Set(['desc', 'metadata', 'text', 'textPath', 'title', 'tspan']);

/**
 * SvgElementNode 表示 SVG 命名空间下的元素节点。
 * SVG 子元素快捷方法只注册到这个类上，避免和 HTML DSL 互相干扰。
 */
export class SvgElementNode extends ElementNode {
  /**
   * SVG 标签方法可以使用 text/style 原名，所以字符串 setup 直接写入文本节点。
   */
  setup(setup) {
    if (typeof setup === 'string' || typeof setup === 'number') {
      return this.child(setup);
    }

    return super.setup(setup);
  }

  /**
   * 在 SVG 容器上创建 <text>；在文本类 SVG 元素内部继续表示文本内容。
   */
  text(...args) {
    if (svgTextContentHosts.has(this._tagName)) {
      const [content, setup] = args;

      if (args.length > 0) {
        this.child(content);
      }

      if (setup !== null && setup !== undefined) {
        this.setup(setup);
      }

      return this;
    }

    return this._svgChild('text', ...args);
  }

  /**
   * 单参数字符串/函数创建 SVG <style>，双参数或对象仍保留 CSS 样式设置能力。
   */
  style(...args) {
    const [name, value] = args;

    if (this._tagName === 'style' && args.length <= 1) {
      if (args.length === 1) {
        this.child(name);
      }

      return this;
    }

    if (args.length <= 1 && isSvgStyleTagSetup(name)) {
      return this._svgChild('style', name);
    }

    return super.style(name, value);
  }

  /** SVG 元素走命名空间创建；其余生命周期与 HTML 元素一致（激活绑定、提交子节点）。 */
  _createElement() {
    return document.createElementNS(SVG_NAMESPACE, this._tagName);
  }

  /**
   * SVGElement.className 通常是 SVGAnimatedString，不能像 HTMLElement 一样直接赋值。
   */
  _syncClassName() {
    const className = [...this._classes].join(' ');

    if (className) {
      this._attrs.class = className;
    } else {
      delete this._attrs.class;
    }

    if (this._el) {
      if (className) {
        this._el.setAttribute('class', className);
      } else {
        this._el.removeAttribute('class');
      }
    }
  }

  _svgChild(tagName, ...setups) {
    const child = new SvgElementNode(tagName);

    setups.forEach((setup) => {
      if (setup !== null && setup !== undefined) {
        child.setup(setup);
      }
    });

    return this.child(child);
  }
}

function isSvgStyleTagSetup(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    Array.isArray(value)
  );
}

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
  'a',
  'script',
  'style',
  'switch',
  'text',
  'title',
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
  return function svgElementFactory(...setups) {
    const node = new SvgElementNode(tagName);
    if (tagName === 'svg') {
      node.style('display', 'block');
    }

    setups.forEach((setup) => {
      if (setup !== null && setup !== undefined) {
        node.setup(setup);
      }
    });

    return node;
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

/**
 * 全部 SVG 标签工厂的命名空间：用来创建游离的内部节点，不必 `new SvgElementNode(...)`。
 *
 *     svgs.rect({ class: 'brick', width: 76, height: 22 });
 *     svgs.g((group) => group.circle({ cx: 0, cy: 0, r: 9 }));
 *
 * 游离节点可以直接 child() 到任意 svg 节点上，也可以先建好复用。
 */
export const svgs = { svg, ...svgChildFactories };

registerChildFactories(HtmlElementNode, { svg });
registerChildFactories(SvgElementNode, svgs);

export * from './icons.js';

function normalizeSvgElementDefinition(definition) {
  if (typeof definition === 'string') {
    return {
      name: definition,
      tagName: definition
    };
  }

  return definition;
}
