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

  /**
   * 添加子节点；字符串和数字会自动转成 VTextNode。
   */
  child(...children) {
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined) {
        return;
      }

      this._children.push(normalizeChild(child));
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
    this._children = [];

    if (this._el?.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }

    return this;
  }

  toHTML() {
    return '';
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

  if (typeof child === 'string' || typeof child === 'number') {
    return new VTextNode(child);
  }

  throw new TypeError('ViewNode child must be a ViewNode, string, or number');
}

export { VTextNode as TextNode, VTextNode as ViewTextNode, vText as text };

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
