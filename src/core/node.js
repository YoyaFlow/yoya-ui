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
 * 支持用 CSS 选择器或真实 DOM 元素作为挂载目标。
 */
export function resolveTarget(target) {
  if (typeof target === 'string') {
    return document.querySelector(target);
  }

  return target;
}

/**
 * toHTML 输出时使用的最小 HTML 转义。
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isBooleanAttribute(name) {
  return booleanAttributes.has(name);
}

/**
 * 把属性写入真实 DOM，并尽量同步同名 DOM property。
 */
export function applyAttribute(element, name, value) {
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

  if (value === true || isBooleanAttribute(name)) {
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

/**
 * 序列化 style 快照，保证 toHTML 和真实 DOM 渲染保持一致。
 */
export function serializeStyles(styles) {
  return Object.entries(styles)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([name, value]) => `${toKebabStyleName(name)}:${escapeHtml(value)}`)
    .join('; ');
}

export function toKebabStyleName(name) {
  return String(name).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * ViewNode 是 yoya-ui 的基础视图节点。
 * 它只管理视图树通用能力：子节点、事件清理、状态和生命周期。
 */
export class ViewNode {
  constructor(setup = null) {
    this._children = [];
    this._events = new Map();
    this._cleanup = [];
    this._states = {};
    this._stateTypes = {};
    this._stateHandlers = new Map();
    this._pendingRemovals = new Set();
    this._childrenDirty = false;
    this._deleted = false;

    if (setup !== null) {
      this.setup(setup);
    }
  }

  /**
   * 统一初始化入口，支持函数、文本和对象配置三种写法。
   */
  setup(setup) {
    if (typeof setup === 'function') {
      setup(this);
    } else if (setup instanceof ViewNode) {
      this.child(setup);
    } else if (typeof setup === 'string' || typeof setup === 'number') {
      this.text(setup);
    } else if (setup && typeof setup === 'object') {
      this._setupObject(setup);
    }

    return this;
  }

  _setupObject(config) {
    if (config.children) {
      this.child(config.children);
    }
  }

  /**
   * 返回子节点快照，避免外部直接修改内部数组。
   */
  children() {
    return [...this._children];
  }

  clearChildren() {
    this._children.forEach((child) => {
      this._pendingRemovals.add(child);
    });
    this._children = [];
    this._childrenDirty = true;
    return this;
  }

  /**
   * 添加子节点；字符串和数字会自动转成 VTextNode。
   */
  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      const viewNode = normalizeChild(child);
      this._pendingRemovals.delete(viewNode);
      this._children.push(viewNode);
      this._childrenDirty = true;
    });

    return this;
  }

  text(content) {
    return this.child(new VTextNode(content));
  }

  /**
   * 注册事件。若 DOM 已创建，立即绑定；否则延迟到 renderDom 阶段绑定。
   */
  on(eventName, handler, options) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }

    this._events.get(eventName).push({ handler, options });

    if (this._el) {
      this._el.addEventListener(eventName, handler, options);
      this._cleanup.push(() => this._el.removeEventListener(eventName, handler, options));
    }

    return this;
  }

  /**
   * 声明节点可识别的状态字段，默认状态类型是 boolean。
   */
  registerStateAttrs(...attrs) {
    attrs.forEach((attr) => {
      if (typeof attr === 'string') {
        this._stateTypes[attr] = 'boolean';
        return;
      }

      if (attr && typeof attr === 'object') {
        Object.entries(attr).forEach(([name, type]) => {
          this._stateTypes[name] = type || 'boolean';
        });
      }
    });

    return this;
  }

  /**
   * 注册状态处理器。状态改变时处理器负责同步样式、属性或内部结构。
   */
  registerStateHandler(stateName, handler) {
    if (!this._stateHandlers.has(stateName)) {
      this._stateHandlers.set(stateName, []);
    }

    this._stateHandlers.get(stateName).push(handler);
    return this;
  }

  /**
   * 设置状态并触发对应处理器。
   */
  setState(stateName, value = true) {
    const oldValue = this._states[stateName];
    this._states[stateName] = value;

    const handlers = this._stateHandlers.get(stateName) || [];
    handlers.forEach((handler) => handler(value, this, oldValue));

    return this;
  }

  getState(stateName) {
    return this._states[stateName];
  }

  getBooleanState(stateName) {
    return Boolean(this.getState(stateName));
  }

  getStringState(stateName) {
    const value = this.getState(stateName);
    return value === undefined || value === null ? '' : String(value);
  }

  getNumberState(stateName) {
    return Number(this.getState(stateName) || 0);
  }

  renderDom() {
    return null;
  }

  /** 将当前 ViewNode 树提交到真实 DOM。 */
  commit() {
    return this.renderDom();
  }

  _commitChildren() {
    this._pendingRemovals.forEach((child) => child.destroy());
    this._pendingRemovals.clear();
    this._childrenDirty = false;
  }

  /**
   * 将当前节点挂载到选择器或 DOM 元素。
   */
  bindTo(target) {
    const parent = resolveTarget(target);
    const element = this.renderDom();

    if (parent && element) {
      parent.appendChild(element);
    }

    return this;
  }

  /**
   * 销毁节点：清理事件、递归销毁子节点，并从 DOM 中移除自身。
   */
  destroy() {
    this._deleted = true;
    this._cleanup.forEach((cleanup) => cleanup());
    this._cleanup = [];
    this._children.forEach((child) => child.destroy());
    this._pendingRemovals.forEach((child) => child.destroy());
    this._pendingRemovals.clear();
    this._children = [];

    if (this._el?.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }

    return this;
  }

  toHTML() {
    return '';
  }

  /**
   * hydration 后同步钩子：子类可在此从真实 DOM 回读状态（如表单控件值）。
   */
  hydrateSnapshot() {
    return this;
  }
}

/**
 * VTextNode 表示视图树中的文本节点，渲染时对应真实 Text 节点。
 * 外部可以继续传入原始字符串，内部统一包装为 VTextNode。
 */
export class VTextNode extends ViewNode {
  constructor(content = '') {
    super(null);
    this._content = String(content);
    this._textNode = null;
  }

  textContent(value) {
    if (value === undefined) {
      return this._content;
    }

    this._content = String(value);
    if (this._textNode) {
      this._textNode.textContent = this._content;
    }
    return this;
  }

  renderDom() {
    if (this._deleted) {
      return null;
    }

    if (!this._textNode) {
      this._textNode = document.createTextNode(this._content);
      this._el = this._textNode;
    }

    return this._textNode;
  }

  toHTML() {
    return this._deleted ? '' : escapeHtml(this._content);
  }
}

/**
 * ComponentNode 延迟解析函数 Factory 或带 render() 的组件对象。
 * 组件只在第一次需要真实节点时解析，并复用解析后的节点。
 */
export class ComponentNode extends ViewNode {
  constructor(component) {
    super(null);
    this._component = component;
    this._resolved = null;
  }

  _resolve() {
    if (this._resolved) {
      return this._resolved;
    }

    const resolved =
      typeof this._component === 'function' ? this._component() : this._component.render();
    if (!(resolved instanceof ViewNode)) {
      throw new TypeError('Component render must return a ViewNode');
    }

    this._resolved = resolved;
    return resolved;
  }

  children() {
    return this._resolved ? this._resolved.children() : [];
  }

  textContent() {
    const component = this._resolve();
    return typeof component.textContent === 'function' ? component.textContent() : '';
  }

  renderDom() {
    if (this._deleted) {
      return null;
    }

    const element = this._resolve().renderDom();
    this._el = element;
    return element;
  }

  toHTML() {
    return this._deleted ? '' : this._resolve().toHTML();
  }

  destroy() {
    if (this._resolved) {
      this._resolved.destroy();
    }

    return super.destroy();
  }
}

/**
 * 创建文本节点的工厂函数。
 */
export function vText(content = '') {
  return new VTextNode(content);
}

/**
 * 统一子节点输入，保证内部树只保存 ViewNode 实例。
 */
export function normalizeChild(child) {
  if (child instanceof ViewNode) {
    return child;
  }

  if (
    typeof child === 'function' ||
    (child && typeof child === 'object' && typeof child.render === 'function')
  ) {
    return new ComponentNode(child);
  }

  if (typeof child === 'string' || typeof child === 'number') {
    return new VTextNode(child);
  }

  throw new TypeError('ViewNode child must be a ViewNode, component, string, or number');
}

export function normalizeSetupArguments(first = null, second = null, third = null) {
  if (typeof second === 'function' && (third === null || third === undefined)) {
    return {
      first,
      options: null,
      callback: second
    };
  }

  return {
    first,
    options: second,
    callback: third
  };
}

export function applyElementOptions(node, options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return node;
  }

  if (options.attrs && typeof node.attr === 'function') {
    node.attr(options.attrs);
  }

  if (options.style && typeof node.styles === 'function') {
    node.styles(options.style);
  }

  return node;
}

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

      if (key === 'attrs') {
        this.attr(value);
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
   * 替换预设类名：移除 old 并添加 next（支持空格分隔多个）。
   * old 不存在时，tolerate 为 true 则仅添加 next；默认 false 为无操作。
   */
  replaceClassName(old, next, tolerate = false) {
    if (!old || !next || old === next) {
      return this;
    }

    if (!this._classes.has(old)) {
      return tolerate ? this.className(next) : this;
    }

    this._classes.delete(old);
    return this.className(next);
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
      this._pendingRemovals.delete(viewNode);
      this._children.push(viewNode);
      this._childrenDirty = true;

      if (this._el) {
        const childElement = viewNode.renderDom();
        if (childElement && childElement.parentNode !== this._el) {
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

    this._commitChildren();
    this._children.forEach((child) => {
      const childElement = child.renderDom();
      if (childElement && childElement.parentNode !== this._el) {
        this._el.appendChild(childElement);
      }
    });

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
  _applyBindingsToElement() {
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
  }

  _applySnapshotToElement() {
    this._applyBindingsToElement();
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
        if (value === true || isBooleanAttribute(name)) {
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
    return serializeStyles(this._styles);
  }
}

/**
 * 为标签创建工厂函数；默认使用 ElementNode，HTML/SVG 层可以传入自己的节点类。
 */
export function createElementFactory(tagName, NodeClass = ElementNode) {
  return function elementFactory(first = null, second = null, third = null) {
    const args = normalizeSetupArguments(first, second, third);
    const node = new NodeClass(tagName, args.first);
    applyElementOptions(node, args.options);
    if (typeof args.callback === 'function') {
      args.callback(node);
    }
    return node;
  };
}

/**
 * 把工厂函数注册为父节点快捷方法，使 page.h1('标题') 这类 DSL 写法成立。
 */
export function registerChildFactories(NodeClass, factories, options = {}) {
  const { override = false } = options;

  Object.entries(factories).forEach(([name, factory]) => {
    if (!override && NodeClass.prototype[name]) {
      return;
    }

    NodeClass.prototype[name] = function childFactory(...args) {
      return this.child(factory(...args));
    };
  });
}

export { VTextNode as TextNode, VTextNode as ViewTextNode, vText as text };
