import { ElementNode } from './element-node.js';

// 核心 HTML 工厂覆盖 WHATWG HTML 标准中的 conforming HTML 元素。
// MathML、SVG 和自定义元素需要不同命名空间或运行时注册机制，后续应放到独立模块。
const htmlElementDefinitions = [
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'search',
  'section',
  'select',
  'selectedcontent',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  { name: 'style', tagName: 'style', aliases: ['styleTag'] },
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  { name: 'varTag', tagName: 'var' },
  'video',
  'wbr'
];

/**
 * 为指定标签创建工厂函数，例如 createElementFactory('div') -> div(setup)。
 */
export function createElementFactory(tagName) {
  return function elementFactory(setup = null) {
    return new ElementNode(tagName, setup);
  };
}

/**
 * 把工厂函数注册为父节点快捷方法，使 page.h1('标题') 这类 DSL 写法成立。
 */
export function registerChildFactories(NodeClass, factories) {
  Object.entries(factories).forEach(([name, factory]) => {
    if (NodeClass.prototype[name]) {
      return;
    }

    NodeClass.prototype[name] = function childFactory(setup = null) {
      return this.child(factory(setup));
    };
  });
}

/**
 * 生成核心 HTML 工厂集合。
 */
export function createHtmlFactories() {
  return htmlElementDefinitions.reduce((factories, definition) => {
    const { aliases = [], name, tagName } = normalizeElementDefinition(definition);
    const factory = createElementFactory(tagName);

    factories[name] = factory;
    aliases.forEach((alias) => {
      factories[alias] = factory;
    });

    return factories;
  }, {});
}

/**
 * 标签定义默认使用同名工厂；遇到 JS 关键字或节点方法冲突时声明别名。
 */
function normalizeElementDefinition(definition) {
  if (typeof definition === 'string') {
    return {
      name: definition,
      tagName: definition
    };
  }

  return definition;
}
