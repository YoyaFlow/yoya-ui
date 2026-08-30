import { ViewNode } from './node.js';

/**
 * ClientOnlyNode 标记"非服务端渲染"的组件模块（islands）：
 * 服务端 toHTML 只输出占位 div；浏览器端 renderDom/hydration 时
 * 解析 loader 并替换占位，组件在客户端本地加载与初始化。
 */
export class ClientOnlyNode extends ViewNode {
  constructor(loader) {
    super(null);
    this._loader = loader;
    this._resolved = null;
  }

  _resolve() {
    if (!this._resolved) {
      const resolved = typeof this._loader === 'function' ? this._loader() : this._loader;
      if (!(resolved instanceof ViewNode)) {
        throw new TypeError('vClientOnly loader must return a ViewNode');
      }
      this._resolved = resolved;
    }
    return this._resolved;
  }

  toHTML() {
    return this._deleted ? '' : '<div class="yoya-client-only" data-client-only="true"></div>';
  }

  renderDom() {
    if (this._deleted) {
      return null;
    }

    const element = this._resolve().renderDom();

    if (this._el && this._el !== element && this._el.parentNode) {
      this._el.parentNode.replaceChild(element, this._el);
    }

    this._el = element;
    return element;
  }

  children() {
    return this._resolved ? this._resolved.children() : [];
  }

  textContent() {
    return this._resolved && typeof this._resolved.textContent === 'function'
      ? this._resolved.textContent()
      : '';
  }

  destroy() {
    if (this._resolved) {
      this._resolved.destroy();
    }
    return super.destroy();
  }
}

export function vClientOnly(loader) {
  return new ClientOnlyNode(loader);
}
