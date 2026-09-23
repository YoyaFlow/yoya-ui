import { HtmlElementNode } from '../html/index.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { allocateId } from '../core/id.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject,
  setupContentSlot
} from '../components/shared.js';

const tooltipPlacementAliases = {
  'bottom-left': 'bottom-start',
  bottomLeft: 'bottom-start',
  'bottom-right': 'bottom-end',
  bottomRight: 'bottom-end',
  'left-bottom': 'left-end',
  leftBottom: 'left-end',
  'left-top': 'left-start',
  leftTop: 'left-start',
  'right-bottom': 'right-end',
  rightBottom: 'right-end',
  'right-top': 'right-start',
  rightTop: 'right-start',
  'top-left': 'top-start',
  topLeft: 'top-start',
  'top-right': 'top-end',
  topRight: 'top-end'
};

const tooltipTriggers = ['click', 'focus', 'manual'];

/** VTooltip 的节点类型（不导出）；公开组件 `vTooltip` 是 vNode 外壳。 */
class TooltipNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VTooltip' });
    this._triggerMode = 'hover';
    this._globalCloseCleanup = null;
    this._panelId = allocateId('yoya-tooltip-panel');
    // 内部状态用 ref 持有（票 01 约定）；open 是「默认真」写方法，无参不是读
    this._open = ref(false);

    this._target = new HtmlElementNode('span', { vn: 'VTooltipTarget' })
      .attr('aria-describedby', this._panelId)
      .on('mouseenter', () => this._handleHoverEnter())
      .on('mouseleave', () => this._handleHoverLeave())
      .on('focusin', () => this._handleFocusEnter())
      .on('focusout', (event) => this._handleFocusLeave(event))
      .on('click', (event) => this._handleTargetClick(event));

    this._panel = new HtmlElementNode('div')
      .id(this._panelId)
      .setup({ vn: 'VTooltipPanel' })
      .attr({ 'aria-hidden': 'true', role: 'tooltip' });

    this.child(this._target, this._panel);
    this.placement('top');
    this.trigger('hover');
    this._setupTooltip(setup);
  }

  target(setup) {
    if (setup === undefined) {
      return this._target;
    }

    setupContentSlot(this._target, setup);
    return this;
  }

  content(setup) {
    if (setup === undefined) {
      return this._panel.children();
    }

    setupContentSlot(this._panel, setup);
    return this;
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    const requestedPlacement = value || 'top';
    const placement = tooltipPlacementAliases[requestedPlacement] || requestedPlacement;
    this.attr('data-placement', placement);
    return this;
  }

  trigger(value) {
    if (value === undefined) {
      return this._triggerMode;
    }

    const nextMode = String(value || 'hover');
    this._triggerMode = tooltipTriggers.includes(nextMode) ? nextMode : 'hover';
    this.attr('data-trigger', this._triggerMode);
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);

    this._open.value = enabled;
    this.attr('data-open', enabled ? 'true' : null);
    this._panel.attr('aria-hidden', enabled ? 'false' : 'true');

    if (enabled) {
      this._bindGlobalCloseHandlers();
    } else {
      this._releaseGlobalCloseHandlers();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    return this.open(!this._open.value);
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      return;
    }

    let clickBound = false;
    let unbindPointer = () => {};
    const handlePointer = (event) => {
      if (!this._el?.contains(event.target)) {
        this.close();
      }
    };
    const handleKey = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      const shouldRestoreFocus = Boolean(this._el?.contains(event.target));
      this.close();
      if (shouldRestoreFocus) {
        this._focusTarget();
      }
    };

    if (this._triggerMode === 'click') {
      unbindPointer = bindDocumentEvent('click', handlePointer);
      clickBound = true;
    }
    const unbindKey = bindDocumentEvent('keydown', handleKey);

    this._globalCloseCleanup = () => {
      if (clickBound) {
        unbindPointer();
      }
      unbindKey();
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _handleHoverEnter() {
    if (this._triggerMode === 'hover') {
      this.open(true);
    }
  }

  _handleHoverLeave() {
    if (this._triggerMode === 'hover') {
      this.close();
    }
  }

  _handleFocusEnter() {
    if (this._triggerMode === 'hover' || this._triggerMode === 'focus') {
      this.open(true);
    }
  }

  _handleFocusLeave(event) {
    if (this._triggerMode !== 'hover' && this._triggerMode !== 'focus') {
      return;
    }

    if (event.relatedTarget && this._target._el?.contains(event.relatedTarget)) {
      return;
    }

    this.close();
  }

  _handleTargetClick() {
    if (this._triggerMode === 'click') {
      this.toggle();
    }
  }

  _focusTarget() {
    const focusable = this._target._el?.querySelector?.(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    (focusable || this._target._el)?.focus?.();
  }

  _setupTooltip(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, open, placement, target, trigger, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (target !== undefined) {
        this.target(target);
      } else if (children !== undefined) {
        this.target(children);
      }

      if (content !== undefined) {
        this.content(content);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }

      if (trigger !== undefined) {
        this.trigger(trigger);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.target(setup);
  }
}

/**
 * 文字提示（形态 B）：视图根是节点类型扩展 `TooltipNode`（目标区 / 面板 / 全局关闭监听归它），
 * 外层 `vNode` 用 `delegateNodeCommands` 补齐命令面与元素 DSL。
 * 面板定位按 `data-placement` 交给 CSS 规则（R5，不再写行内 placement 样式）。
 */
export function VTooltip(props = {}) {
  return vNode((api) => {
    const node = new TooltipNode(props);
    delegateNodeCommands(api, node);
    // 位置参数里的字符串 / 数字：迁移前走 `_setupTooltip(setup)` 的兜底分支 = 目标区内容
    // （组件化后位置参数回落到"视图根的 setup 分派"，不回构造函数，所以要显式补这一条）
    api.setupString = (value) => {
      node.target(value);
      return api;
    };
    return node;
  });
}

export const vTooltip = createComponentShortcut(VTooltip, { props: true });
