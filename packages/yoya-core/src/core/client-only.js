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
      this._resolved = resolveClientOnly(this._loader);
      this._resolved._parent = this; // 错误处理沿父链上溯到 ClientOnly 的父节点
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

  /**
   * 透明包装：**元素是内层节点的**（自己只有 SSR 占位），所以落地钩子也归内层
   * （`core/hooks.js` 沿这条链转发；不转发的话 `vClientOnly(() => 带 whenMount 的组件)`
   * 里的集成永远不初始化）。
   */
  viewRoots() {
    return [this._resolve()];
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

/** 与 renderToString 的 createRootNode 一致：支持 ViewNode 与函数工厂（票 07：对象组件退场）。 */
function resolveClientOnly(value) {
  if (value instanceof ViewNode) {
    return value;
  }

  if (typeof value === 'function') {
    return resolveClientOnly(value());
  }

  throw new TypeError(
    'vClientOnly loader must return a ViewNode or a component definition function ' +
      '(object components retired in 0.7.0)'
  );
}
