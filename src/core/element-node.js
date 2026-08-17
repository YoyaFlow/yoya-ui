import { ViewNode, escapeHtml, normalizeChild } from './view-node.js';

// HTML 布尔属性序列化时只需要属性名即可表示启用。
const booleanAttributes = new Set(['checked', 'disabled', 'readonly', 'selected']);

// 无闭合标签的 HTML 元素，toHTML 时不能追加结束标签。
const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

/**
 * ElementNode 表示可渲染成真实 DOM Element 的视图节点。
 * 它负责属性、类名、样式、事件和子节点到 DOM 的同步。
 */
export class ElementNode extends ViewNode {
  constructor(tagName, setup = null) {
    super(null);
    this._tagName = tagName;
    this._attrs = {};
    this._styles = {};
    this._classes = new Set();
    this._el = null;

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 对象 setup 支持 class/style/children/onXxx 和普通属性配置。
   */
  _setupObject(config) {
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'class' || key === 'className') {
        this.className(value);
        return;
      }

      if (key === 'style') {
        this.styles(value);
        return;
      }

      if (key === 'children') {
        this.child(value);
        return;
      }

      if (key.startsWith('on') && typeof value === 'function') {
        this.on(key.slice(2).toLowerCase(), value);
        return;
      }

      if (typeof this[key] === 'function') {
        this[key](value);
        return;
      }

      if (typeof value !== 'function') {
        this.attr(key, value);
      }
    });
  }

  tagName() {
    return this._tagName;
  }

  /**
   * 获取当前元素及其子节点的聚合文本。
   */
  textContent() {
    return this._children
      .map((child) => (typeof child.textContent === 'function' ? child.textContent() : ''))
      .join('');
  }

  /**
   * 读写属性。传入 null/undefined/false 时移除属性。
   */
  attr(name, value) {
    if (value === undefined && typeof name === 'string') {
      return this._attrs[name];
    }

    if (name && typeof name === 'object') {
      Object.entries(name).forEach(([key, nextValue]) => this.attr(key, nextValue));
      return this;
    }

    if (value === null || value === undefined || value === false) {
      delete this._attrs[name];
    } else {
      this._attrs[name] = value;
    }

    if (this._el) {
      applyAttribute(this._el, name, value);
    }

    return this;
  }

  id(value) {
    return value === undefined ? this.attr('id') : this.attr('id', value);
  }

  name(value) {
    return value === undefined ? this.attr('name') : this.attr('name', value);
  }

  /**
   * 添加类名，支持空格分隔、数组和多参数。
   */
  className(...classes) {
    if (classes.length === 0) {
      return [...this._classes].join(' ');
    }

    classes.flat(Infinity).forEach((value) => {
      if (!value) {
        return;
      }

      String(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((className) => this._classes.add(className));
    });

    this._syncClassName();
    return this;
  }

  class(...classes) {
    return this.className(...classes);
  }

  /**
   * 读写单个样式；传入对象时转给 styles() 批量处理。
   */
  style(name, value) {
    if (value === undefined && typeof name === 'string') {
      return this._styles[name];
    }

    if (name && typeof name === 'object') {
      return this.styles(name);
    }

    if (value === null || value === undefined || value === '') {
      delete this._styles[name];
    } else {
      this._styles[name] = value;
    }

    if (this._el) {
      this._el.style[name] = value || '';
    }

    return this;
  }

  styles(styles) {
    Object.entries(styles || {}).forEach(([name, value]) => this.style(name, value));
    return this;
  }

  /**
   * 添加子节点。如果当前 DOM 已创建，立即追加对应 DOM。
   */
  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      const viewNode = normalizeChild(child);
      this._children.push(viewNode);

      if (this._el) {
        const childElement = viewNode.renderDom();
        if (childElement) {
          this._el.appendChild(childElement);
        }
      }
    });

    return this;
  }

  /**
   * 创建或复用真实 DOM 元素。
   */
  renderDom() {
    if (this._deleted) {
      return null;
    }

    if (!this._el) {
      this._el = document.createElement(this._tagName);
      this._applySnapshotToElement();
    }

    return this._el;
  }

  /**
   * 将视图树序列化为 HTML 字符串，主要用于服务端模板或测试断言。
   */
  toHTML() {
    if (this._deleted) {
      return '';
    }

    const attrs = this._serializeAttributes();
    const startTag = attrs ? `<${this._tagName} ${attrs}>` : `<${this._tagName}>`;

    if (voidElements.has(this._tagName)) {
      return startTag;
    }

    return `${startTag}${this._children.map((child) => child.toHTML()).join('')}</${this._tagName}>`;
  }

  /**
   * DOM 首次创建时，把之前记录的属性、样式、事件和子节点一次性同步。
   */
  _applySnapshotToElement() {
    Object.entries(this._attrs).forEach(([name, value]) => applyAttribute(this._el, name, value));
    this._syncClassName();
    Object.entries(this._styles).forEach(([name, value]) => {
      this._el.style[name] = value;
    });
    this._events.forEach((listeners, eventName) => {
      listeners.forEach(({ handler, options }) => {
        this._el.addEventListener(eventName, handler, options);
        this._cleanup.push(() => this._el.removeEventListener(eventName, handler, options));
      });
    });
    this._children.forEach((child) => {
      const childElement = child.renderDom();
      if (childElement) {
        this._el.appendChild(childElement);
      }
    });
  }

  /**
   * 同步 class 集合到属性快照和真实 DOM。
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
        this._el.className = className;
      } else {
        this._el.removeAttribute('class');
      }
    }
  }

  /**
   * 序列化属性快照，供 toHTML 使用。
   */
  _serializeAttributes() {
    const attrs = { ...this._attrs };
    const styleText = this._serializeStyles();

    if (styleText) {
      attrs.style = attrs.style ? `${attrs.style}; ${styleText}` : styleText;
    }

    return Object.entries(attrs)
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
      .map(([name, value]) => {
        if (value === true || booleanAttributes.has(name)) {
          return `${name}="${name}"`;
        }

        return `${name}="${escapeHtml(value)}"`;
      })
      .join(' ');
  }

  /**
   * 序列化 style 快照，保证 toHTML 和真实 DOM 渲染保持一致。
   */
  _serializeStyles() {
    return Object.entries(this._styles)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([name, value]) => `${toKebabStyleName(name)}:${escapeHtml(value)}`)
      .join('; ');
  }
}

/**
 * 把属性写入真实 DOM，并尽量同步同名 DOM property。
 */
function applyAttribute(element, name, value) {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    if (name in element) {
      try {
        element[name] = false;
      } catch {
        // 某些 DOM property 是只读的，忽略即可。
      }
    }
    return;
  }

  if (value === true || booleanAttributes.has(name)) {
    element.setAttribute(name, name);
    if (name in element) {
      try {
        element[name] = true;
      } catch {
        // 某些 DOM property 是只读的，忽略即可。
      }
    }
    return;
  }

  element.setAttribute(name, String(value));

  if (name in element) {
    try {
      element[name] = value;
    } catch {
      // 某些 DOM property 是只读的，忽略即可。
    }
  }
}

function toKebabStyleName(name) {
  return String(name).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}
