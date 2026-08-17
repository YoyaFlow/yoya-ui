import { ElementNode } from './element-node.js';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * SvgElementNode 表示 SVG 命名空间下的元素节点。
 * 它复用 ElementNode 的属性、样式、事件和子节点能力，只替换 DOM 创建方式。
 */
export class SvgElementNode extends ElementNode {
  renderDom() {
    if (this._deleted) {
      return null;
    }

    if (!this._el) {
      this._el = document.createElementNS(SVG_NAMESPACE, this._tagName);
      this._applySnapshotToElement();
    }

    return this._el;
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
}
