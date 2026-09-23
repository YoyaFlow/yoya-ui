import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories } from '../core/node.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { vNode } from '../core/v-node.js';
import {
  applyComponentArguments,
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/**
 * vSplitPanel 是可拖拽分隔条的面板：两块面板 + 中间分隔条，
 * 支持横向/纵向、拖拽与键盘调整首面板尺寸，双击分隔条恢复 50%。
 */
/** VSplitPanel 的节点类型（不导出）；公开组件 `vSplitPanel` 是 vNode 外壳。 */
class SplitPanelNode extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', { vn: 'VSplitPanel' });
    // 静态样式与"按方向走的几何"都在 `yoya.ui.css`（R5）；方向 / 首面板尺寸是状态位与 CSS 变量

    this._direction = 'horizontal';
    this._firstSize = '50%';
    this._minSize = 40;
    this._drag = null;
    this._dragMove = null;
    this._dragUp = null;

    this._first = new HtmlElementNode('div', { vn: 'VSplitPanelFirst' }).attr(
      'data-vsplit-first',
      'true'
    );

    this._second = new HtmlElementNode('div', { vn: 'VSplitPanelSecond' }).attr(
      'data-vsplit-second',
      'true'
    );

    this._divider = new HtmlElementNode('div', { vn: 'VSplitPanelDivider' })
      .attr({
        'aria-orientation': 'horizontal',
        'data-vsplit-divider': 'true',
        role: 'separator',
        tabindex: '0',
        title: '拖拽调整面板大小，双击恢复 50%'
      })
      .on('mousedown', (event) => this._startDrag(event))
      .on('dblclick', () => this.reset())
      .on('keydown', (event) => this._handleKeydown(event));

    this.child(this._first, this._divider, this._second);
    this._sync();
    this._setupSplitPanel(setup);
    applyComponentArguments(this, options, callback);
  }

  /** 读写分隔方向：horizontal 左右分栏，vertical 上下分栏。 */
  direction(value) {
    if (value === undefined) {
      return this._direction;
    }

    this._direction = value === 'vertical' ? 'vertical' : 'horizontal';
    this._sync();
    return this;
  }

  /** 读写首面板尺寸（数字按 px，字符串原样，如 '50%'）。 */
  size(value) {
    if (value === undefined) {
      return this._firstSize;
    }

    this._firstSize = normalizeLength(value);
    this._sync();
    return this;
  }

  /** 首面板最小尺寸（px），拖拽/键盘调整时不会小于该值。 */
  minSize(value) {
    if (value === undefined) {
      return this._minSize;
    }

    const next = Number(value);
    this._minSize = Number.isFinite(next) ? Math.max(0, next) : this._minSize;
    return this;
  }

  /** 恢复首面板为 50%。 */
  reset() {
    return this.size('50%');
  }

  /** 设置首面板内容（字符串/节点/组件，或 setup 回调）。 */
  first(setup) {
    replaceChildren(this._first, []);
    if (typeof setup === 'function') {
      setup(this._first);
    } else {
      replaceChildren(this._first, normalizeChildren(setup));
    }
    return this;
  }

  /** 设置次面板内容（字符串/节点/组件，或 setup 回调）。 */
  second(setup) {
    replaceChildren(this._second, []);
    if (typeof setup === 'function') {
      setup(this._second);
    } else {
      replaceChildren(this._second, normalizeChildren(setup));
    }
    return this;
  }

  destroy() {
    this._endDrag();
    return super.destroy();
  }

  _sync() {
    const horizontal = this._direction === 'horizontal';
    // 方向与首面板尺寸都走状态位 / CSS 变量（映射在样式表里，R5）
    this.attr('data-direction', horizontal ? null : 'vertical');
    this._first.style('--yoya-split-first-size', this._firstSize);
    this._divider.attr('aria-orientation', horizontal ? 'horizontal' : 'vertical');
    return this;
  }

  _startDrag(event) {
    if (event.button !== 0 || !this._el) {
      return;
    }

    event.preventDefault();
    const horizontal = this._direction === 'horizontal';
    const rect = this._first._el.getBoundingClientRect();
    const start = horizontal ? event.clientX : event.clientY;
    const startSize = horizontal ? rect.width : rect.height;
    const containerSize = horizontal ? this._el.offsetWidth : this._el.offsetHeight;
    this._drag = { containerSize, start, startSize };

    this._dragMove = (moveEvent) => this._onDrag(moveEvent);
    this._dragUp = () => this._endDrag();
    this._dragUnbindMove = bindDocumentEvent('mousemove', this._dragMove);
    this._dragUnbindUp = bindDocumentEvent('mouseup', this._dragUp);
  }

  _onDrag(event) {
    if (!this._drag) {
      return;
    }

    const horizontal = this._direction === 'horizontal';
    const delta = (horizontal ? event.clientX : event.clientY) - this._drag.start;
    const next = clampSize(
      this._drag.startSize + delta,
      this._minSize,
      this._drag.containerSize - this._minSize
    );
    this._firstSize = `${Math.round(next)}px`;
    this._sync();
  }

  _handleKeydown(event) {
    const delta =
      event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -16
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 16
          : 0;
    if (!delta || !this._el) {
      return;
    }

    event.preventDefault();
    const horizontal = this._direction === 'horizontal';
    const containerSize = horizontal ? this._el.offsetWidth : this._el.offsetHeight;
    const current = Number.parseFloat(this._firstSize) || 0;
    const next = clampSize(current + delta, this._minSize, containerSize - this._minSize);
    this._firstSize = `${Math.round(next)}px`;
    this._sync();
  }

  _endDrag() {
    if (this._dragMove) {
      this._dragUnbindMove?.();
      this._dragMove = null;
      this._dragUnbindMove = null;
    }
    if (this._dragUp) {
      this._dragUnbindUp?.();
      this._dragUp = null;
      this._dragUnbindUp = null;
    }
    this._drag = null;
  }

  _setupSplitPanel(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { direction, first, minSize, second, size, ...elementConfig } = setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (direction !== undefined) {
        this.direction(direction);
      }
      if (size !== undefined) {
        this.size(size);
      }
      if (minSize !== undefined) {
        this.minSize(minSize);
      }
      if (first !== undefined) {
        this.first(first);
      }
      if (second !== undefined) {
        this.second(second);
      }
      return;
    }

    this.first(setup);
  }
}

/**
 * 可拖拽分隔条的面板（形态 B）：视图根是节点类型扩展 `SplitPanelNode`（拖拽 / 键盘调整 / 双击复位
 * 都归它），外层 `vNode` 用 `delegateNodeCommands` 补齐命令面与元素 DSL。方向与首面板尺寸走
 * `data-direction` + `--yoya-split-first-size`（几何映射在 `yoya.ui.css`，R5）。
 */
export function VSplitPanel(props = {}) {
  return vNode((api) => {
    const node = new SplitPanelNode(props);
    delegateNodeCommands(api, node);
    return node;
  });
}

export const vSplitPanel = createComponentShortcut(VSplitPanel, { props: true });

registerChildFactories(HtmlElementNode, { vSplitPanel });

function normalizeLength(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

function clampSize(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), Math.max(max, min));
}
