import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories } from '../core/node.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeValue
} from '../components/shared.js';

/**
 * vSplitPanel 是可拖拽分隔条的面板：两块面板 + 中间分隔条，
 * 支持横向/纵向、拖拽与键盘调整首面板尺寸，双击分隔条恢复 50%。
 */
export class VSplitPanel extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vsplit-panel');
    this.styles({
      boxSizing: 'border-box',
      display: 'flex',
      minHeight: '0',
      minWidth: '0',
      overflow: 'hidden',
      width: '100%'
    });

    this._direction = 'horizontal';
    this._firstSize = '50%';
    this._minSize = 40;
    this._drag = null;
    this._dragMove = null;
    this._dragUp = null;

    this._first = new HtmlElementNode('div')
      .className('yoya-vsplit-panel-first')
      .attr('data-vsplit-first', 'true')
      .styles({
        boxSizing: 'border-box',
        minHeight: '0',
        minWidth: '0',
        overflow: 'auto'
      });

    this._second = new HtmlElementNode('div')
      .className('yoya-vsplit-panel-second')
      .attr('data-vsplit-second', 'true')
      .styles({
        boxSizing: 'border-box',
        flex: '1 1 auto',
        minHeight: '0',
        minWidth: '0',
        overflow: 'auto'
      });

    this._divider = new HtmlElementNode('div')
      .className('yoya-vsplit-panel-divider')
      .attr({
        'aria-orientation': 'horizontal',
        'data-vsplit-divider': 'true',
        role: 'separator',
        tabindex: '0',
        title: '拖拽调整面板大小，双击恢复 50%'
      })
      .styles({
        background: 'transparent',
        boxSizing: 'border-box',
        flex: '0 0 auto'
      })
      .on('mousedown', (event) => this._startDrag(event))
      .on('dblclick', () => this.reset())
      .on('keydown', (event) => this._handleKeydown(event))
      .on('mouseenter', () => this._hoverDivider(true))
      .on('mouseleave', () => this._hoverDivider(false));

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
    this.style('flexDirection', horizontal ? 'row' : 'column');
    this._first.styles({
      flex: '0 0 auto',
      height: horizontal ? '100%' : this._firstSize,
      width: horizontal ? this._firstSize : '100%'
    });
    this._divider.styles(
      horizontal
        ? { cursor: 'col-resize', height: '100%', width: '6px' }
        : { cursor: 'row-resize', height: '6px', width: '100%' }
    );
    this._divider.attr('aria-orientation', horizontal ? 'horizontal' : 'vertical');
    return this;
  }

  _hoverDivider(hovered) {
    this._divider.style(
      'background',
      hovered
        ? themeValue('color-primary-subtle', '#eff6ff')
        : 'var(--yoya-color-border-faint, #efefef)'
    );
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
    document.addEventListener('mousemove', this._dragMove);
    document.addEventListener('mouseup', this._dragUp);
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
      document.removeEventListener('mousemove', this._dragMove);
      this._dragMove = null;
    }
    if (this._dragUp) {
      document.removeEventListener('mouseup', this._dragUp);
      this._dragUp = null;
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

export function vSplitPanel(first = null, second = null, third = null) {
  return createComponentFactory(VSplitPanel, first, second, third);
}

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
