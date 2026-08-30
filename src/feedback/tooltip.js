import { HtmlElementNode } from '../html/index.js';
import { allocateId } from '../core/id.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  setupContentSlot
} from '../components/shared.js';

const tooltipPlacementStyles = {
  bottom: { left: '50%', top: 'calc(100% + 8px)', transform: 'translateX(-50%)' },
  'bottom-end': { right: '0', top: 'calc(100% + 8px)' },
  'bottom-start': { left: '0', top: 'calc(100% + 8px)' },
  left: { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
  'left-end': { right: 'calc(100% + 8px)', top: '0' },
  'left-start': { bottom: '0', right: 'calc(100% + 8px)' },
  right: { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
  'right-end': { left: 'calc(100% + 8px)', top: '0' },
  'right-start': { bottom: '0', left: 'calc(100% + 8px)' },
  top: { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
  'top-end': { bottom: 'calc(100% + 8px)', right: '0' },
  'top-start': { bottom: 'calc(100% + 8px)', left: '0' }
};

const tooltipPlacementBase = {
  bottom: null,
  left: null,
  right: null,
  top: null,
  transform: null
};

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

export class VTooltip extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._triggerMode = 'hover';
    this._globalCloseCleanup = null;
    this._panelId = allocateId('yoya-vtooltip-panel');

    this._target = new HtmlElementNode('span')
      .className('yoya-vtooltip-target')
      .attr('aria-describedby', this._panelId)
      .on('mouseenter', () => this._handleHoverEnter())
      .on('mouseleave', () => this._handleHoverLeave())
      .on('focusin', () => this._handleFocusEnter())
      .on('focusout', (event) => this._handleFocusLeave(event))
      .on('click', (event) => this._handleTargetClick(event));

    this._panel = new HtmlElementNode('div')
      .id(this._panelId)
      .className('yoya-vtooltip-panel')
      .attr({ 'aria-hidden': 'true', role: 'tooltip' });

    this.className(componentClass, 'yoya-vtooltip');
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
    this._panel.styles(getTooltipPlacementStyles(placement));
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

    this.setState('open', enabled);
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
    return this.open(!this.getBooleanState('open'));
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup || typeof document === 'undefined') {
      return;
    }

    let clickBound = false;
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
      document.addEventListener('click', handlePointer);
      clickBound = true;
    }
    document.addEventListener('keydown', handleKey);

    this._globalCloseCleanup = () => {
      if (clickBound) {
        document.removeEventListener('click', handlePointer);
      }
      document.removeEventListener('keydown', handleKey);
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

export function vTooltip(first = null, second = null, third = null) {
  return createComponentFactory(VTooltip, first, second, third);
}

function getTooltipPlacementStyles(placement) {
  return {
    ...tooltipPlacementBase,
    ...(tooltipPlacementStyles[placement] || tooltipPlacementStyles.top)
  };
}
