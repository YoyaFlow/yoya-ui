import { HtmlElementNode } from '../html/index.js';
import { VMenu } from '../navigation/menu.js';
import { VButton } from './button.js';
import { allocateId } from '../core/id.js';
import {
  createComponentFactory,
  componentClass,
  dropdownPlacementStyles,
  isPlainObject,
  setupButtonSlot,
  setupContentSlot
} from '../components/shared.js';

export class VDropdownMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    this._panelId = allocateId('yoya-vdropdown-panel');
    this._trigger = new VButton('操作')
      .className('yoya-vdropdown-trigger')
      .attr({
        'aria-controls': this._panelId,
        'aria-expanded': 'false',
        'aria-haspopup': 'menu'
      })
      .on('click', (event) => {
        event.preventDefault();
        if (!this._trigger.getBooleanState('disabled')) {
          this.toggle();
        }
      });
    this._trigger.on('keydown', (event) => this._handleTriggerKeydown(event));
    this._menu = new VMenu().className('yoya-vdropdown-content');
    this._panel = new HtmlElementNode('div')
      .id(this._panelId)
      .className('yoya-vdropdown-panel')
      .attr('aria-hidden', 'true')
      .child(this._menu);

    this.className(componentClass, 'yoya-vdropdown-menu');
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (
        this._closeOnSelect &&
        menuItem &&
        !menuItem.disabled &&
        !menuItem.classList.contains('yoya-vsubmenu-trigger')
      ) {
        this.close();
        this._focusTrigger();
      }
    });
    this.child(this._trigger, this._panel);
    this.placement('bottom-start');
    this._setupDropdownMenu(setup);
  }

  trigger(setup) {
    if (setup === undefined) {
      return this._trigger;
    }

    setupButtonSlot(this._trigger, setup);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    const placement = value || 'bottom-start';
    this.attr('data-placement', placement);
    this._panel.styles(dropdownPlacementStyles(placement));
    return this;
  }

  closeOnSelect(value = true) {
    this._closeOnSelect = Boolean(value);
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);

    this.setState('open', enabled);
    this.attr('data-open', enabled ? 'true' : null);
    this._trigger.attr('aria-expanded', enabled ? 'true' : 'false');
    this._panel.attr('aria-hidden', enabled ? 'false' : 'true');

    if (enabled) {
      this._bindGlobalCloseHandlers();
      this._focusFirstEnabledItem();
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

    const handlePointer = (event) => {
      if (!this._el?.contains(event.target)) {
        this.close();
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        const shouldRestoreFocus = this._el?.contains(event.target);
        this.close();
        if (shouldRestoreFocus) {
          this._focusTrigger();
        }
      }
    };

    document.addEventListener('click', handlePointer);
    document.addEventListener('keydown', handleKey);
    this._globalCloseCleanup = () => {
      document.removeEventListener('click', handlePointer);
      document.removeEventListener('keydown', handleKey);
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _handleTriggerKeydown(event) {
    if (this._trigger.getBooleanState('disabled')) {
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Spacebar'].includes(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.key === 'ArrowUp') {
      this.open();
      this._focusLastEnabledItem();
      return;
    }

    this.open();
  }

  _focusFirstEnabledItem() {
    const firstItem = this._menu._enabledMenuItems()[0];
    firstItem?.focus?.();
  }

  _focusLastEnabledItem() {
    const items = this._menu._enabledMenuItems();
    const lastItem = items[items.length - 1];
    lastItem?.focus?.();
  }

  _focusTrigger() {
    this._trigger._el?.focus();
  }

  _setupDropdownMenu(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        closeOnSelect,
        content,
        label,
        menu,
        menuContent,
        open,
        placement,
        text,
        trigger,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (trigger !== undefined) {
        this.trigger(trigger);
      } else if (label !== undefined) {
        this.trigger(label);
      } else if (text !== undefined) {
        this.trigger(text);
      }

      const menuSetup = menuContent ?? menu ?? content ?? children;
      if (menuSetup !== undefined) {
        this.menuContent(menuSetup);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }

      if (closeOnSelect !== undefined) {
        this.closeOnSelect(closeOnSelect);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.trigger(setup);
  }
}

export function vDropdownMenu(first = null, second = null, third = null) {
  return createComponentFactory(VDropdownMenu, first, second, third);
}
